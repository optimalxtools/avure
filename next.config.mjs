const PRICE_WISE_ASSETS = Object.freeze([
	'./app/(modules)/price-wise/data-acquisition/outputs/**/*',
	'./app/(modules)/price-wise/data-acquisition/archive/**/*',
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		outputFileTracingIncludes: {
			'/price-wise/overview': PRICE_WISE_ASSETS,
			'/price-wise/breakdown': PRICE_WISE_ASSETS,
			'/price-wise/monitor': PRICE_WISE_ASSETS,
			'/api/price-wise/analyzer/run': PRICE_WISE_ASSETS,
			'/api/price-wise/analyzer/status': PRICE_WISE_ASSETS,
			'/api/price-wise/scraper/file': PRICE_WISE_ASSETS,
			'/api/price-wise/scraper/run': PRICE_WISE_ASSETS,
			'/api/price-wise/scraper/status': PRICE_WISE_ASSETS,
			'/api/price-wise/scraper/stop': PRICE_WISE_ASSETS,
		},
	},
};

export default nextConfig;
