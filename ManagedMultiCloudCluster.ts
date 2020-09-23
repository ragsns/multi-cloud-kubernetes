import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import {ManagedAksCluster} from "./ManagedAksCluster";
import {ManagedGkeCluster} from "./ManagedGkeCluster";
import {ManagedEksCluster} from "./ManagedEksCluster";

export interface ClusterDetails {
    provider: k8s.Provider;
    kubeconfig: pulumi.Output<any>;
}

export class ManagedMultiCloudCluster extends pulumi.ComponentResource {
    public Clusters: ClusterDetails[] = [];

    constructor(name: string,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:managed:MultiCloudCluster", name, {}, opts);

        const gkeCluster = new ManagedGkeCluster(`gke-demo-cluster`);
        this.Clusters.push({
            provider: gkeCluster.GkeProvider,
            kubeconfig: gkeCluster.GkeKubeConfig,
        });

        const aksCluster = new ManagedAksCluster(`aks-demo-cluster`);
        this.Clusters.push({
            provider: aksCluster.AksProvider,
            kubeconfig: aksCluster.AksKubeConfig,
        });

        const eksCluster = new ManagedEksCluster(`eks-demo-cluster`);
        this.Clusters.push({
            provider: eksCluster.EksProvider,
            kubeconfig: eksCluster.EksKubeConfig,
        });
    }
}
