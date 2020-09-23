import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as kubernetes from "@pulumi/kubernetes"

// define the shape of the args
export interface ChartMuseumArgs {
    namespace?: string;
    replicas?: number;
    api?: boolean;
    metrics?: boolean;
    service?: {
        type: string
    }
    provider: kubernetes.Provider;
    cloud: string;
    region: string;
}

export class ChartMuseum extends pulumi.ComponentResource {
    deployment: kubernetes.apps.v1.Deployment;
    namespace: kubernetes.core.v1.Namespace;
    service: kubernetes.core.v1.Service;
    secret: kubernetes.core.v1.Secret;

    private cloudProvider: string;
    private cloudProviderRegion: string;
    private bucketName: pulumi.Output<string>;

    constructor(name: string, args: ChartMuseumArgs, opts?: pulumi.ComponentResourceOptions) {
        super("managedcluster:chartmuseum", name, {}, opts);

        const labels = {
            app: "chartmuseum",
            release: name,
        }

        this.namespace = new kubernetes.core.v1.Namespace(`chartmuseum-${name}-namespace`, {
            metadata: {
                name: args.namespace || "chartmuseum",
                labels: labels
            }
        }, {parent: this, provider: args.provider})

        switch (args.cloud) {
            case "aws": // this can be extended for each cloud to set up the individual storage needs
                const bucket = new aws.s3.Bucket(`chartmuseum-${name}-bucket`, {}, {parent: this})
                this.bucketName = bucket.bucket;

                const iamUser = new aws.iam.User(`chartmuseum-${name}-iam-user`, {
                    path: "/chartmuseum/"
                }, {parent: this})

                new aws.iam.UserPolicy(`chartmuseum-${name}-iam-policy`, {
                    user: iamUser.name,
                    policy: bucket.bucket.apply(bucketName => JSON.stringify({
                        Version: "2012-10-17",
                        Statement: [{
                            Sid: "AllowListObjects",
                            Effect: "Allow",
                            Action: ["s3:ListBucket"],
                            Resource: `arn:aws:s3:::${bucketName}`,
                        }, {
                            Sid: "AllowObjectsCRUD",
                            Effect: "Allow",
                            Action: [
                                "s3:DeleteObject",
                                "s3:GetObject",
                                "s3:PutObject"
                            ],
                            Resource: `arn:aws:s3:::${bucketName}/*`
                        }],
                    })),
                }, {parent: iamUser})
                const accessKey = new aws.iam.AccessKey(`chartmuseum-${name}-iam-accesskey`, {
                    user: iamUser.name
                }, {parent: iamUser})

                // register the secret with k8s and input the credentials
                this.secret = new kubernetes.core.v1.Secret(`chartmuseum-${name}-secret`, {
                    metadata: {
                        namespace: this.namespace.metadata.name,
                        labels: labels,
                    },
                    data: {
                        "AWS_ACCESS_KEY_ID": accessKey.id.apply(k => Buffer.from(k).toString("base64")),
                        "AWS_SECRET_ACCESS_KEY": accessKey.secret.apply(k => Buffer.from(k).toString("base64")),
                    }
                }, {parent: this.namespace, provider: args.provider})

                this.cloudProvider = "amazon";
                this.cloudProviderRegion = args.region;

                break;
            default:
                throw new pulumi.RunError("Must specify a cloud")
                break;
        }

        // the env var is "DISABLE_API" so we invert
        var api = String(!args.api || true)
        var metrics = String(!args.metrics || true)

        this.deployment = new kubernetes.apps.v1.Deployment(`chartmuseum-${name}-deployment`, {
            metadata: {
                namespace: this.namespace.metadata.name,
                labels: labels
            },
            spec: {
                selector: {
                    matchLabels: labels
                },
                replicas: args.replicas || 1,
                strategy: {
                    rollingUpdate: {
                        maxUnavailable: 0,
                    },
                    type: "RollingUpdate",
                },
                template: {
                    metadata: {
                        name: name,
                        labels: labels,
                    },
                    spec: {
                        securityContext: {
                            fsGroup: 1000,
                        },
                        containers: [{
                            name: "chartmuseum",
                            image: "chartmuseum/chartmuseum:v0.12.0",
                            imagePullPolicy: "IfNotPresent",
                            env: [
                                {
                                    name: "DISABLE_API",
                                    value: api,
                                },
                                {
                                    name: "DISABLE_METRICS",
                                    value: metrics,
                                },
                                {
                                    name: "LOG_JSON",
                                    value: "true",
                                },
                                {
                                    name: "PROV_POST_FORM_FIELD_NAME",
                                    value: "prov",
                                },
                                {
                                    name: "STORAGE",
                                    value: this.cloudProvider
                                },
                                {
                                    name: `STORAGE_${this.cloudProvider.toUpperCase()}_REGION`,
                                    value: this.cloudProviderRegion
                                },
                                {
                                    name: `STORAGE_${this.cloudProvider.toUpperCase()}_BUCKET`,
                                    value: this.bucketName,
                                },
                                {
                                    name: "AWS_ACCESS_KEY_ID",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: this.secret.metadata.name,
                                            key: "AWS_ACCESS_KEY_ID"
                                        }
                                    }
                                },
                                {
                                    name: "AWS_SECRET_ACCESS_KEY",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: this.secret.metadata.name,
                                            key: "AWS_SECRET_ACCESS_KEY"
                                        }
                                    }
                                }
                            ],
                            args: [
                                "--port=8080",
                            ],
                            ports: [{
                                name: "http",
                                containerPort: 8080,
                            }],
                            livenessProbe: {
                                httpGet: {
                                    path: "/health",
                                    port: "http",
                                },
                                failureThreshold: 3,
                                initialDelaySeconds: 5,
                                periodSeconds: 10,
                                successThreshold: 1,
                                timeoutSeconds: 1,
                            },
                            readinessProbe: {
                                httpGet: {
                                    path: "/health",
                                    port: "http",
                                },
                                failureThreshold: 3,
                                initialDelaySeconds: 5,
                                periodSeconds: 10,
                                successThreshold: 1,
                                timeoutSeconds: 1,
                            },
                        }],
                        volumes: [{
                            name: "storage-volume",
                            emptyDir: {},
                        }],
                    },
                },
            },
        }, {parent: this.namespace});

        this.service = new kubernetes.core.v1.Service(`chartmuseum-${name}-service`, {
            metadata: {
                labels: labels,
                namespace: this.namespace.metadata.name,
            },
            spec: {
                type: args.service?.type || "ClusterIP",
                ports: [{
                    port: 80,
                    targetPort: "http",
                    protocol: "TCP",
                    name: "http",
                }],
                selector: labels,
            }
        }, {parent: this.namespace, provider: args.provider})
    }
}
