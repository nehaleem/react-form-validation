import React, { Component } from 'react';
import P from 'prop-types';
import omitBy from 'lodash/omitBy';
import uniqBy from 'lodash/uniqBy';
import uniq from 'lodash/uniq';
import difference from 'lodash/difference';
import assert from 'assert';

import { CancelReason, cancelable } from 'utils';

const BulkValidatorInternalPropsKeys = [ 'id', 'propKeys', 'stopOnError', 'processAsBulk' ];

export default class BulkValidator extends Component {
	static propTypes = {
		isEnabled: P.bool,
		items: P.arrayOf(
			P.shape({
				id: P.number.isRequired,
			}),
		),
		onStart: P.func,
		onDone: P.func,
	};

	static defaultProps = {
		isEnabled: true,
		onStart () {},  // onStart (validationNamesByItemId)
		onDone () {},   // onValidationDone (reportsByModelKey)
	};

	_runningValidations = [];  // { itemId, propKey, validate? }
	_runningBulkValidations = []; // { propKey, itemIds, initiatedByKeys, validate? }

	shouldComponentUpdate (nextProps) {
		return (
			this.props.items !== nextProps.items ||
			this.props.isEnabled !== nextProps.isEnabled
		);
	}

	componentWillMount () {
		const validators = React.Children.toArray(this.props.children);

		assert(validators.length, 'No validators defined, specify atleast 1 child');

		const uniqueValidatorPairs = new Set();

		validators.forEach((validator) => {
			assert(
				typeof validator.props.name !== 'undefined',
				`BulkValidator ${validator.type.id} must have "props.name: String"!`,
			);

			assert(
				Array.isArray(validator.props.propKeys),
				`BulkValidator ${validator.type.name} must define props.propKeys: String[] !`,
			);

			validator.props.propKeys
				.forEach((key, index) => assert(
					typeof key === 'string',
					`BulkValidator ${validator.type.name} has invalid props.propKeys[${index}] (Must be a string)!`,
				));

			if ('stopOnError' in validator.props) {
				assert(
					typeof validator.props.stopOnError === 'boolean',
					`BulkValidator ${validator.type.name} has invalid props.stopOnError (${typeof validator.props.stopOnError})!`,
				);
			}

			if ('processAsBulk' in validator.props) {
				assert(
					typeof validator.props.processAsBulk === 'boolean',
					`BulkValidator ${validator.type.name} has invalid props.processAsBulk (${typeof validator.props.processAsBulk})!`,
				);
			}

			if ('dontRunIfKeysHasErrors' in validator.props) {
				assert(
					Array.isArray(validator.props.dontRunIfKeysHasErrors),
					`BulkValidator ${validator.type.name} has invalid props.dontRunIfHasErrorFields (${typeof validator.props.dontRunIfKeysHasErrors})!`,
				);

				validator.props.dontRunIfKeysHasErrors
					.forEach((key, index) => assert(
						typeof key === 'string',
						`BulkValidator ${validator.type.name} has invalid props.dontRunIfKeysHasErrors[${index}] (Must be a string)!`,
					));
			}

			const validatorUniqueKey = `${validator.type.name}-${validator.props.name}`;

			assert(
				!uniqueValidatorPairs.has(validatorUniqueKey),
				`Cannot have same unique validator pairs ${validatorUniqueKey}`,
			);

			uniqueValidatorPairs.add(validatorUniqueKey);
		});
	}

	componentDidMount () {
		if (
			!this.props.items.length ||
			!this.props.isEnabled
		) {
			return;
		}

		const validators = React.Children.toArray(this.props.children);
		const getValidatorName = (validator) => validator.props.name;
		const uniqueValidationNames = uniqBy(validators, getValidatorName).map(getValidatorName);

		const validationNamesByItemId = this.props.items
			.reduce((map, item) => ({ ...map, [item.id]: uniqueValidationNames }), {});

		// Notify which item validation has started
		this.props.onStart(validationNamesByItemId);

		// Run all validators on all items on first mount
		this._runValidatorsOnForms(validators, this.props.items);
	}

	componentDidUpdate (prevProps) {
		if (!this.props.isEnabled) {
			return;
		}

		const validators = React.Children.toArray(this.props.children);
		const prevItems = prevProps.items;
		const nextItems = this.props.items;

		const prevItemIds = prevItems.map(this._getIdFromItem);
		const nextItemIds = nextItems.map(this._getIdFromItem);

		const deletedIds = difference(prevItemIds, nextItemIds);
		const addedIds = difference(nextItemIds, prevItemIds);

		const addedItems = nextItems.filter((item) => addedIds.includes(item.id));
		const itemIdsDifferenceSet = new Set(deletedIds.concat(addedIds));

		// Without deleted items
		const filteredPrevItems = prevItems
			.filter((item) => !itemIdsDifferenceSet.has(item.id))
			.sort(this._sortByItemId);

		// Without added items
		const filteredNextItems = nextItems
			.filter((item) => !itemIdsDifferenceSet.has(item.id))
			.sort(this._sortByItemId);


		const updatedItemIndexes = filteredNextItems
			.reduce((indexes, nextItem, index) => {
				if (nextItem !== filteredPrevItems[index]) {
					indexes.push(index);
				}

				return indexes;
			}, []);
		const itemsToValidate = updatedItemIndexes
			.map((index) => filteredNextItems[index])
			.concat(addedItems);

		const updatedKeysByItemId = updatedItemIndexes
			.reduce((map, index) => {
				const prevItem = filteredPrevItems[index];
				const nextItem = filteredNextItems[index];

				if (!map[nextItem.id]) {
					map[nextItem.id] = [];
				}

				const nextItemKeys = Object.keys(nextItem);

				nextItemKeys
					.forEach((key) => {
						if (prevItem[key] !== nextItem[key]) {
							map[nextItem.id].push(key);
						}
					});

				return map;
			}, {});

		// Abort async validations on changed and deleted items
		const asyncValidationIndexesToAbort = [];

		this._runningValidations.forEach((validation, index) => {
			const shouldAbortValidation = this._shouldRemoveValidation(validation, deletedIds, updatedKeysByItemId);

			if (shouldAbortValidation) {
				asyncValidationIndexesToAbort.push(index);

				if (validation.validate) {
					validation.validate.cancel('aborted by typing');
				}
			}
		});

		// Remove aborted async validations from stack
		this._runningValidations = this._runningValidations
			.filter((validation, index) => !asyncValidationIndexesToAbort.includes(index));

		const asyncBulkValidationIndexesToAbort = [];

		// Abort async bulk validations on changed items
		this._runningBulkValidations.forEach((validation, index) => {
			const updatedKeysAreIncludedInValidator = Object.keys(updatedKeysByItemId)
				.some((itemId) => updatedKeysByItemId[itemId]
					.some((key) => validation.validator.props.propKeys.includes(key)),
				);
			const validatorIsRunningOnChangedOrDeletedIds = [ ...Object.keys(updatedKeysByItemId), ...deletedIds ]
				.some((itemId) => validation.itemIds.includes(Number.parseInt(itemId, 10)));

			if (updatedKeysAreIncludedInValidator && validatorIsRunningOnChangedOrDeletedIds) {
				asyncBulkValidationIndexesToAbort.push(index);

				if (validation.validate) {
					validation.validate.cancel('aborted by typing');
				}
			}
		});

		const validatorsToRunByItemId = {};
		const validatedKeysByItemId = {};

		const resolveAndSetValidators = (itemId, updatedKeys) => {
			validators.forEach((validator) => {
				updatedKeys.forEach((propKey) => {
					if (validator.props.propKeys.includes(propKey)) {
						// Add validator
						if (!validatorsToRunByItemId[itemId]) {
							validatorsToRunByItemId[itemId] = [];
						}

						validatorsToRunByItemId[itemId].push(validator);

						if (!validatedKeysByItemId[itemId]) {
							validatedKeysByItemId[itemId] = [];
						}

						const validatedKeys = validatedKeysByItemId[itemId];

						if (!validatedKeys.includes(propKey)) {
							validatedKeys.push(propKey);
						}
					}
				});
			});
		};

		// Resolve validators and updated propKeys from changed items
		Object.keys(updatedKeysByItemId)
			.forEach((itemId) => resolveAndSetValidators(itemId, updatedKeysByItemId[itemId]));

		// Resolve validators and updated propKeys from added items
		addedItems.forEach((item) => resolveAndSetValidators(item.id, Object.keys(item)));

		if (Object.keys(validatedKeysByItemId).length) {
			this.props.onStart(validatedKeysByItemId);
		}

		if (Object.keys(validatorsToRunByItemId).length) {
			this._runValidatorsOnItems(validatorsToRunByItemId, itemsToValidate);
		}
	}

	componentWillUnmount () {
		//TODO: Cancel all running promises
	}

	render () {
		return null;
	}

	async _runValidatorsOnItems (validatorsToRunByItemId, itemsToValidate) {
		const stoppedValidationOnItemNames = [];
		const bulkValidatorsToRun = new Set();
		let validationReports = [];

		for (let itemIndex = 0, itemsCount = itemsToValidate.length; itemIndex < itemsCount; itemIndex++) {
			const item = itemsToValidate[itemIndex];
			const itemId = item.id;
			const validators = validatorsToRunByItemId[itemId];

			for (let validatorIndex = 0, validatorsCount = validators.length; validatorIndex < validatorsCount; validatorIndex++) {
				const validator = validators[validatorIndex];

				if (
					stoppedValidationOnItemNames.includes(validator.props.name) ||
					(
						validator.props.dontRunIfKeysHasErrors &&
						validator.props.dontRunIfKeysHasErrors
							.some((key) => stoppedValidationOnItemNames.includes(key))
					)
				) {
					continue;
				}

				const validate = validator.type;
				const validationId = validator.type.name;
				const propKey = validator.props.name;
				const propKeys = validator.props.propKeys;

				// Per-item validation
				if (!validator.props.processAsBulk) {
					const data = {
						...item,
						...omitBy(validator.props, this._omitInternalValidatorProps),
					};

					// Alow assign custom prop values depending on function resolve
					for (const [ validatorPropKey, validatorPropValue ] of Object.entries(validator.props)) {
						if (typeof validatorPropValue === 'function') {
							data[validatorPropKey] = validatorPropValue(item);
						}
					}

					let report = validate(data) || {};

					// Sync validation
					if (!(typeof report.then === 'function')) {

						if (report.errors && validator.props.stopOnError) {
							stoppedValidationOnItemNames.push(validator.props.name);
						}

						validationReports.push({
							...report,
							id: validationId,
							itemId: item.id,
							name: propKey,
							initiatedByKeys: propKeys,
						});
					}
					// Async validation
					else {
						//TODO: Optimize non-bulk async operations under 1 Promise.all() call
						report = cancelable(
							report,
							() => console.log(`Async validation "${validationId}" in item.id=${item.id} aborted!`),
						);

						this._runningValidations.push({ itemId, propKey, validate: report });

						try {
							let asyncReport = await report;

							asyncReport = asyncReport || {};

							console.log(`Async validation ${validationId} on item.id=${item.id} DONE`);

							if (asyncReport.errors && validator.props.stopOnError) {
								stoppedValidationOnItemNames.push(validator.props.name);
							}

							const validationReport = {
								...asyncReport,
								itemId,
								id: validationId,
								name: propKey,
								initiatedByKeys: propKeys,
							};

							if (asyncReport.data) {
								validationReport.data = asyncReport.data;
							}

							validationReports.push(validationReport);
						}
						catch (error) {
							if (!(error instanceof CancelReason)) {
								if (!error.statusCode) {
									// Ensure not swallowing internal errors
									throw (error);
								}
								else {
									validationReports.push({
										itemId,
										id: validationId,
										name: propKey,
										errors: [ error.message ],
										initiatedByKeys: propKeys,
									});

									if (validator.props.stopOnError) {
										stoppedValidationOnItemNames.push(validator.props.name);
									}
								}
							}
						}

						// Remove running validation from stack
						this._runningValidations = this._runningValidations
							.filter((validation) => validation.itemId !== itemId && validation.propKey !== propKey);
					}
				}
				// Bulk validation
				else {
					bulkValidatorsToRun.add(validator);
				}
			}
		}

		// Send validation reports
		if (validationReports.length) {
			const consolidatedReports = this._consolidateReports(validationReports);

			this.props.onDone(consolidatedReports);
		}

		// Set validating state again on fields that are bulk validating
		const bulkValidatedKeyByItemId = {};

		validationReports.forEach((report) => {
			const { name, itemId } = report;

			const isStillValidatingInBulkValidations = Array.from(bulkValidatorsToRun)
				.some((validator) => validator.props.propKeys.some((key) => key === name));

			if (isStillValidatingInBulkValidations) {
				if (!bulkValidatedKeyByItemId[itemId]) {
					bulkValidatedKeyByItemId[itemId] = [];
				}

				bulkValidatedKeyByItemId[itemId].push(name);
			}
		});

		if (Object.keys(bulkValidatedKeyByItemId).length) {
			for (const [ itemId, keys ] of Object.entries(bulkValidatedKeyByItemId)) {
				bulkValidatedKeyByItemId[itemId] = uniq(keys);
			}

			this.props.onStart(bulkValidatedKeyByItemId);
		}

		// Process bulk validations
		for (const validator of bulkValidatorsToRun) {
			if (
				stoppedValidationOnItemNames.includes(validator.props.name) ||
				(
					validator.props.dontRunIfKeysHasErrors &&
					validator.props.dontRunIfKeysHasErrors
						.some((key) => stoppedValidationOnItemNames.includes(key))
				)
			) {
				continue;
			}

			const validate = validator.type;
			const validationId = validator.type.name;
			const propKey = validator.props.name;
			const propKeys = validator.props.propKeys;

			// Filter updated items where should be bulk validator applied
			const items = itemsToValidate
				.filter((item) => validatorsToRunByItemId[item.id].includes(validator))
				.map((item) => {
					const computedItemData = {};

					// Alow assign custom prop values depending on function resolve
					for (const [ validatorPropKey, validatorPropValue ] of Object.entries(validator.props)) {
						if (typeof validatorPropValue === 'function') {
							computedItemData[validatorPropKey] = validatorPropValue(item);
						}
					}

					return { ...item, ...computedItemData };
				});

			const props = omitBy(validator.props, this._omitInternalValidatorProps);

			let reports = validate(items, props);

			// Sync validation
			if (!(typeof reports.then === 'function')) {
				if (reports.some((report) => report.errors) && validator.props.stopOnError) {
					stoppedValidationOnItemNames.push(validator.props.name);
				}

				reports.forEach((report = {}) => {
					validationReports.push({
						...report, // Report must include itemId to proper pair reports to items !!
						id: validationId,
						name: propKey,
						initiatedByKeys: propKeys,
					});
				});
			}
			// Async validation
			else {
				reports = cancelable(
					reports,
					() => console.log(`Async bulk validation "${validationId}" aborted!`),
				);

				this._runningBulkValidations.push({
					itemIds: itemsToValidate.map((item) => item.id),
					propKey, validator,
					validate: reports,
				});

				try {
					const asyncReports = await reports;

					console.log(`Async bulk validation ${validationId} DONE`);

					asyncReports.forEach((report = {}) => {
						if (report.reportsByName) {
							for (const [ name, multipleReport ] of Object.entries(report.reportsByName)) {
								if (multipleReport.errors && validator.props.stopOnError) {
									stoppedValidationOnItemNames.push(name);
								}

								validationReports.push({
									...multipleReport,
									...(multipleReport.data ? { data: multipleReport.data } : {}),
									itemId: report.itemId,
									id: validationId,
									name,
									initiatedByKeys: propKeys,
								});
							}
						}
						else {
							if (asyncReports.some((report) => report.errors) && validator.props.stopOnError) {
								stoppedValidationOnItemNames.push(validator.props.name);
							}

							validationReports.push({
								...report, // Report must include itemId to proper pair reports to items !!
								...(report.data ? { data: report.data } : {}),
								id: validationId,
								name: propKey,
								initiatedByKeys: propKeys,
							});
						}
					});

					// Remove async bulk validations from stack
					this._runningBulkValidations = this._runningBulkValidations
						.filter((runningValidator) => validator !== runningValidator);
				}
				catch (error) {
					if (error instanceof CancelReason) {
						// Remove aborted async bulk validations from stack
						this._runningBulkValidations = this._runningBulkValidations
							.filter((runningValidator) => validator !== runningValidator);
					}
					else {
						if (!error.statusCode) {
							// Ensure not swallowing internal errors
							throw (error);
						}
						else {
							reports.forEach((report = {}) => {
								validationReports.push({
									itemId: report.itemId, // Report must include itemId to proper pair reports to items !!
									id: validationId,
									name: propKey,
									errors: [ error.message ],
									initiatedByKeys: propKeys,
								});
							});

							if (validator.props.stopOnError) {
								stoppedValidationOnItemNames.push(validator.props.name);
							}
						}
					}
				}
			}
		}

		const bulkValidationIds = Array.from(bulkValidatorsToRun).map((validator) => validator.type.name);

		validationReports = validationReports.filter((report) => bulkValidationIds.includes(report.id));

		if (validationReports.length) {
			const consolidatedReports = this._consolidateReports(validationReports);

			this.props.onDone(consolidatedReports);
		}
	}

	_omitInternalValidatorProps = (value, key) => {
		return (
			BulkValidatorInternalPropsKeys.includes(key) ||
			typeof value === 'function'
		);
	}

	_consolidateReports (reports) {
		return reports.reduce((acc, report) => {
			const { errors, warnings, ...restOfReport } = report;

			if (errors) {
				errors.forEach((error) => {
					acc.push({ type: 'error', message: error, ...restOfReport });
				});
			}

			if (warnings) {
				warnings.forEach((warning) => {
					acc.push({ type: 'warning', message: warning, ...restOfReport });
				});
			}

			if (!errors && !warnings) {
				acc.push({ type: 'valid', ...restOfReport });
			}

			return acc;
		}, []);
	}

	_sortByItemId = (itemA, itemB) => itemA.id - itemB.id
	_shouldRemoveValidation = (validation, deletedIds, updatedKeysByItemId) => {
		return (
			deletedIds.includes(validation.itemId) ||
			(
				updatedKeysByItemId[validation.itemId] &&
				updatedKeysByItemId[validation.itemId].includes(validation.key)
			)
		);
	}
	_getIdFromItem = (item) => item.id
}
