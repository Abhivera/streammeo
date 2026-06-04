import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

const here = path.dirname(fileURLToPath(import.meta.url));
// infrastructure/ lives inside the backend project; two levels up from lib/ is the backend root.
const backendRoot = path.join(here, "..", "..");
const widgetDistDir = path.join(backendRoot, "widget", "dist");

/**
 * Serves the embeddable widget bundle (`widget.js`) from a private S3 bucket
 * fronted by a CloudFront CDN. The bundle is built in `backend/widget` (esbuild)
 * — run `npm run widget:build` before `cdk deploy` (the infra:deploy script does
 * this automatically). Store owners point their `<script src>` at the CDN URL.
 */
export class WidgetCdnStack extends Construct {
  readonly distribution: cloudfront.Distribution;
  readonly bucket: s3.Bucket;
  readonly widgetUrl: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    if (!fs.existsSync(path.join(widgetDistDir, "widget.js"))) {
      throw new Error(
        `Widget bundle not found at ${widgetDistDir}/widget.js. ` +
          "Build it first: `npm run widget:build` (from the backend/ project).",
      );
    }

    const isProd = process.env.CDK_ENV === "prod";
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // Private origin bucket — only reachable through CloudFront (Origin Access Control).
    this.bucket = new s3.Bucket(this, "WidgetBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy,
      autoDeleteObjects: !isProd,
    });

    this.distribution = new cloudfront.Distribution(this, "WidgetCdn", {
      comment: "Streammeo embeddable widget bundle",
      defaultRootObject: "widget.js",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        // The widget is loaded cross-origin from arbitrary store domains.
        responseHeadersPolicy:
          cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_AND_SECURITY_HEADERS,
        compress: true,
      },
    });

    // Upload the built bundle and invalidate the CDN edge cache on every deploy.
    new s3deploy.BucketDeployment(this, "DeployWidget", {
      sources: [s3deploy.Source.asset(widgetDistDir)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/widget.js", "/*"],
    });

    this.widgetUrl = `https://${this.distribution.distributionDomainName}/widget.js`;
  }
}
