import { delay } from 'utils';

export class AppSettings {
	static SUBMIT_RESPONSE_DELAY = 1500;
	static SUBMIT_SHOULD_RETURN_ERRORS = false;

	static ASYNC_FIELD_VALIDATION_DELAY = 2000;
}

export async function submit (items) {
	await delay(AppSettings.SUBMIT_RESPONSE_DELAY);

	const problems = [];

	if (AppSettings.SUBMIT_SHOULD_RETURN_ERRORS) {
		items.forEach((item) => {
			problems.push({
				itemId: item.id,
				name: 'ErrorFromAPI',
				type: 'error',
				name: 'username',
				message: 'This is error from backend!'
			});
		});
	}

	if (Object.keys(problems).length) {
		return {
			statusCode: 406,
			data: { problems },
		};
	}
	else {
		return {
			statusCode: 200,
			data: {},
		};
	}
};

