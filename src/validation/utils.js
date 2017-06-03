import assert from 'assert';

export function assertValidators (validators) {
	assert(validators.length, 'No validators defined, specify atleast 1');

	const uniqueValidatorPairs = new Set();

	validators.forEach((validator) => {
		assert(typeof validator.props.name !== 'undefined', `Validator ${validator.type.name} has not props.name!`);

		if ('stopOnError' in validator.props) {
			assert(
				typeof validator.props.stopOnError === 'boolean',
				`Validator ${validator.type.name} has invalid props.stopOnError!`,
			);
		}

		const validatorUniqueKey = `${validator.type.name}-${validator.props.name}`;

		assert(
			!uniqueValidatorPairs.has(validatorUniqueKey),
			`Cannot have same unique validator pairs ${validatorUniqueKey}`,
		);

		uniqueValidatorPairs.add(validatorUniqueKey);
	});
}
