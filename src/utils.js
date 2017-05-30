// presumably standard
export class CancelReason extends Error {}

// Promise.cancelable? third party library?
export function cancelable (p, onCancel) {
	// todo: refactor into utility function allowing: return cancelable(resultPromise, () => {xhr.abort()})
	var doCancel = null;
	var cancelPromise = new Promise((resolve, reject) => {
		doCancel = (reason) => {
			reject(new CancelReason(reason));

			return raced;
		};
	});

	var raced = Promise.race([ p, cancelPromise ])
		.catch((reason) => {
			if (reason instanceof CancelReason) {
				onCancel();
			}
			return Promise.reject(reason);
		});

	raced.cancel = doCancel;

	return raced;
}

export function generateReport (errors, warnings) {
	const report = {};

	if (errors) {
		Object.assign(report, { errors });
	}

	if (warnings) {
		Object.assign(report, { warnings });
	}

	return report;
};

export function parseValidationResults (fieldName, validationResults) {
	return validationResults.filter((result) => result.fieldName === fieldName);
}

export function areResultsWithoutError (...validationResults) {
	validationResults = validationResults.reduce((acc, results) => {
		if (results) {
			acc = acc.concat(results);
		}

		return acc;
	}, []);

	if (!validationResults) {
		return true;
	}
	else {
		return validationResults.every((result) => result.type !== 'error');
	}
}
