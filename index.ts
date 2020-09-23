import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes"
import {ManagedMultiCloudCluster} from "./ManagedMultiCloudCluster";
import {ManagedEksCluster} from "./ManagedEksCluster";
import {ChartMuseum} from "./ChartMuseum";
import {ManagedAksCluster} from "./ManagedAksCluster";
import {ManagedGkeCluster} from "./ManagedGkeCluster";

// There are 5 sets of work here
// 1. An EKS Cluster
// 2. An AKS Cluster
// 3. A GKE Cluster
// 4. Mulitcloud Clusters - all of the above
// 5. Deploying the Chart Museum application to EKS

// The configuration you need to set
// pulumi config set aws:region us-west-2
// pulumi config set azure:location westus
// pulumi config set gcp:region us-west1
// pulumi config set gcp:zone us-west1-a
// pulumi config set gcp:project <your project name>

// The demos have been written to show how Pulumi can interact with Kubernetes directly
// from within the same Pulumi application where the infrastructure has been created
// The demos run as follows:

// Managed AKS Cluster
// const aksCluster = new ManagedAksCluster(pulumi.getProject());
// export const aksKubeConfig = aksCluster.AksKubeConfig;

// Managed GKE Cluster
// const gkeCluster = new ManagedGkeCluster(pulumi.getProject());
// export const gkeKubeConfig = gkeCluster.GkeKubeConfig;

// Managed EKS Cluster
// const eksCluster = new ManagedEksCluster(pulumi.getProject());
// export const eksKubeConfig = eksCluster.EksKubeConfig;

// ManagedMultiCluster
// This will create a cluster in each of the cloud environments and then deploy a namespace to them
// const multiCloudCluster = new ManagedMultiCloudCluster(pulumi.getProject());
// let x = 0;
// for (const cluster of multiCloudCluster.Clusters){
//     const ns = new kubernetes.core.v1.Namespace(`${pulumi.getProject()}-namespace-${x++}`, {
//         metadata: {
//             name: pulumi.getProject(),
//         }
//     }, {
//         provider: cluster.provider,
//     })
// }

// Deploy an EKS Cluster + then deploy a ChartMuseum Application to it
// then export the kubeconfig so that it can be used from the CLI
// const projectName = pulumi.getProject()
// const eksCluster = new ManagedEksCluster(projectName);
// const chartMuseum = new ChartMuseum(projectName, {
//     cloud: "aws",
//     region: "us-west-2",
//     provider: eksCluster.EksProvider,
// });

