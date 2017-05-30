const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = function () {
	return {
		entry: {
			main: './src/index.js',
		},
		output: {
			filename: 'js/[name].[chunkhash].js',
			path: path.resolve(__dirname, 'dist'),
		},
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: 'vendor',
				minChunks (module) {
					return module.context && module.context.indexOf('node_modules') !== -1;
				},
			}),

			new HtmlWebpackPlugin({
				filename: 'index.html',
				template: 'src/index.html',
				inject: 'body',
			}),

			new CleanWebpackPlugin([ 'dist' ], {
				root: __dirname,
				verbose: true,
				dry: false,
				watch: true,
			}),
		],
		devtool: 'inline-source-map',
		module: {
			rules: [
				{
					test: /\.js?$/,
					use: [ 'babel-loader' ],
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			modules: [
				path.resolve('./src'),
				path.resolve('./node_modules'),
			],
		},
	};
};
