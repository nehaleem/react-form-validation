import { generateReport } from 'utils';

// Validator props
// name - String - Field name
// stopOnError - Bool
export const delay = (delay = 1000) => new Promise((resolve) => setTimeout(() => resolve(), delay));

export const LengthRange = ({ from = 0, to = Infinity, length }) => {
	if (length < from) {
		return generateReport([ 'Is too small' ]);
	}
	else if (length > to) {
		return generateReport([ 'Is too long' ]);
	}
	else {
		return null;
	}
};

export const IsRequired = ({ value }) => {
	return !value || typeof value === 'string' && !value.length ? generateReport([ 'Field is required' ]) : null;
};

export const IsUniqueAsync = async () => {
	console.log('Async validation isUnique started');

	await delay(2000);

	return null;
};

export const ShouldntContainBullshit = ({ value }) => {
	if ([ 'cock', 'shit' ].includes(value)) {
		return generateReport(null, [ 'Value should not contain bullshit names' ]);
	}
	else {
		return null;
	}
};

export const MustBeEqual = ({ value1, value2 }) => {
	return value1 === value2 ? null : generateReport([ 'Must be equal' ]);
};

export const ValidateImage = async ({ imageBlob }) => {
	console.log('Async validation isUnique started');

	await delay(2000);

	return {
		data: {
			width: 200,
			height: 150,
			url: 'https://cdn.dribbble.com/users/88726/screenshots/375025/ufo_porno2_teaser.jpg',
		},
	};
};
