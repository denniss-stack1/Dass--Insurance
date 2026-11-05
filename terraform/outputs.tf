output "api_gateway_url" {
  value       = aws_api_gateway_deployment.deploy.invoke_url
  description = "The URL of the API Gateway stage where the backend is accessible."
}

output "s3_website_url" {
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
  description = "Direct website endpoint of the S3 bucket."
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "The domain name of the CloudFront CDN distribution serving the frontend."
}
