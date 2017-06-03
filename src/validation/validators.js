import { generateErrors, generateWarnings, generateMultipleReports, delay } from 'utils';
import { AppSettings } from 'mocks';

// Validator props
// name - String - Field name
// stopOnError - Bool
// processAsBulk - Bool
// ORDER: hard (stopOnError), warnings, error, bulkValidator

export const LengthRange = ({ from = 0, to = Infinity, value }) => {
	const length = value.length;

	if (length < from) {
		return generateErrors([ 'Is too short' ]);
	}
	else if (length > to) {
		return generateErrors([ 'Is too long' ]);
	}
	else {
		return null;
	}
};

export const IsRequired = ({ value }) => {
	return !value || typeof value === 'string' && !value.length ? generateErrors([ 'Field is required' ]) : null;
};

export const CheckSpellingAsyncBulk = async (items, props) => {
	console.log(`Async bulk validation checkSpelling started on ${items.length} items`);

	await delay(AppSettings.ASYNC_FIELD_VALIDATION_DELAY);

	const reports = items.map((item) => {
		const result = { itemId: item.id };

		if (item.fullName === 'john') {
			Object.assign(
				result,
				generateMultipleReports({
					fullName: {
						...generateErrors([ 'Fullname cannot be "john"' ]),
					},
				}),
			);
		}

		return result;
	});

	return reports;
};

export const IsUniqueAsync = async ({ value }) => {
	console.log('Async validation isUnique started');

	await delay(AppSettings.ASYNC_FIELD_VALIDATION_DELAY);

	return value === 'bob' ? generateErrors([ 'Username bob is already registered' ]) : null;
};

export const ShouldntContainBullshit = ({ value }) => {
	if ([ 'cock', 'shit' ].includes(value)) {
		return generateWarnings([ 'Value should not contain bullshit names' ]);
	}
	else {
		return null;
	}
};

export const MustBeEqual = ({ value1, value2, message }) => {
	return value1 === value2 ? null : generateErrors([ message || 'Must be equal' ]);
};

export const ValidateImage = async ({ blobData }) => {
	console.log('Async validation ValidateImage started');

	await delay(AppSettings.ASYNC_FIELD_VALIDATION_DELAY);

	return {
		data: {
			width: 200,
			height: 150,
			url: 'https://cdn.dribbble.com/users/88726/screenshots/375025/ufo_porno2_teaser.jpg',
		},
	};
};
