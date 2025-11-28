const ChartModule = (() => {
	const getMoodData = async (days = 7) => {
		const allAssess = await CyberSitDB.getAssessments();
		const recent = allAssess.slice(-days);
		return {
			labels: recent.map((a) => new Date(a.timestamp).toLocaleDateString()),
			data: recent.map((a) => (typeof a.responses?.q6 === 'number' ? a.responses.q6 : Number(a.responses?.q6) || 0)),
		};
	};

	const getEnergyData = async (days = 7) => {
		const allAssess = await CyberSitDB.getAssessments();
		const recent = allAssess.slice(-days);
		return {
			labels: recent.map((a) => new Date(a.timestamp).toLocaleDateString()),
			data: recent.map((a) => (typeof a.responses?.q7 === 'number' ? a.responses.q7 : Number(a.responses?.q7) || 0)),
		};
	};

	const getSedentaryData = async (days = 7) => {
		const allAssess = await CyberSitDB.getAssessments();
		const recent = allAssess.slice(-days);
		return {
			labels: recent.map((a) => new Date(a.timestamp).toLocaleDateString()),
			data: recent.map((a) => (typeof a.responses?.q4 === 'number' ? a.responses.q4 : Number(a.responses?.q4) || 0)),
		};
	};

	const getStepsData = async (days = 7) => {
		const allAssess = await CyberSitDB.getAssessments();
		const recent = allAssess.slice(-days);
		return {
			labels: recent.map((a) => new Date(a.timestamp).toLocaleDateString()),
			data: recent.map((a) => (typeof a.responses?.q11 === 'number' ? a.responses.q11 : Number(a.responses?.q11) || 0)),
		};
	};

	const drawChart = (canvasId, label, data, color) => {
		const ctx = document.getElementById(canvasId);
		if (!ctx) return;
		if (window[canvasId + 'ChartInstance']) {
			window[canvasId + 'ChartInstance'].destroy();
		}

		// Determine y-axis max: for steps use dynamic scaling, otherwise keep default 10
		let yMax = 10;
		if (canvasId === 'stepsChart' || /steps/i.test(label)) {
			const maxVal = data.data.length ? Math.max(...data.data.map((v) => (isFinite(v) ? v : 0))) : 0;
			// If maxVal is 0, keep a small default scale to show baseline
			if (maxVal > 0) {
				// Round up to a nice number
				const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
				yMax = Math.ceil((maxVal * 1.1) / magnitude) * magnitude;
			} else {
				yMax = 1000; // default for empty steps chart
			}
		}

		window[canvasId + 'ChartInstance'] = new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.labels,
				datasets: [
					{
						label: label,
						data: data.data,
						borderColor: color,
						backgroundColor: color + '20',
						borderWidth: 2,
						tension: 0.4,
						fill: true,
						pointRadius: 4,
						pointBackgroundColor: color,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: { display: true },
					title: { display: true, text: label },
				},
				scales: {
					y: {
						beginAtZero: true,
						max: yMax,
					},
				},
			},
		});
	};

	return { getMoodData, getEnergyData, getSedentaryData, getStepsData, drawChart };
})();