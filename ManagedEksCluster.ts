import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export class ManagedEksCluster extends pulumi.ComponentResource {
    public EksProvider: k8s.Provider;
    public EksKubeConfig: pulumi.Output<any>;

    constructor(name: string,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:managed:EksCluster", name, {}, opts);

        // Create a VPC.
        const vpc = new awsx.ec2.Vpc(name, {
            cidrBlock: "172.16.0.0/16",
            tags: { "Name": name },
        });

        // Create the EKS cluster.
        const cluster = new eks.Cluster(name, {
            vpcId: vpc.id,
            publicSubnetIds: vpc.publicSubnetIds,
            instanceType: "t2.medium",
            desiredCapacity: 2,
            minSize: 1,
            maxSize: 2,
            storageClasses: "gp2",
            deployDashboard: false,
        });

        this.EksProvider = cluster.provider;
        this.EksKubeConfig = cluster.kubeconfig;
    }
}
