const App = (() => {
	let currentScreen = 'home';
	let assessmentResponses = {};
	let assessmentQuestionIndex = 0;
	let screenTimeStart = Date.now();

	const init = async () => {
		await CyberSitDB.init();
		setupScreenTracking();
		attachEventListeners();
		// Start the in-page scheduler (schedules prompts while the page is open)
		Scheduler.init();
		renderScreen('home');
	};

	const setupScreenTracking = () => {
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				screenTimeStart = Date.now();
			}
		});
		window.addEventListener('beforeunload', () => {
			if (!document.hidden) {
				const duration = Date.now() - screenTimeStart;
			}
		});
	};

	const attachEventListeners = () => {
		document.addEventListener('click', async (e) => {
			if (e.target.classList.contains('nav-tab')) {
				const screen = e.target.dataset.screen;
				renderScreen(screen);
			}

			if (currentScreen === 'home' && e.target.id === 'start-assessment') {
				startAssessment();
			}

			if (currentScreen === 'assessment') {
				if (e.target.id === 'next-btn') nextQuestion();
				if (e.target.id === 'prev-btn') prevQuestion();
				if (e.target.id === 'skip-btn') skipQuestion();
				if (e.target.classList.contains('choice-btn')) selectChoice(e.target);
			}

			if (currentScreen === 'settings' && e.target.id === 'save-settings-btn') {
				saveSettings();
			}

			if (currentScreen === 'settings' && e.target.id === 'reschedule-btn') {
				await Scheduler.reschedule();
				await updateUpcomingTimesDisplay();
				alert('Rescheduled prompts for today');
			}

			if (currentScreen === 'settings' && e.target.id === 'export-data-btn') {
				const csv = await ExportModule.generateCSV();
				ExportModule.downloadFile(csv, 'cybersit-data.csv', 'text/csv');
			}

			if (currentScreen === 'settings' && e.target.id === 'clear-data-btn') {
				showConfirmDialog('Clear All Data?', 'This will delete all assessments and journal entries.', () => {
					CyberSitDB.clearAllData();
					renderScreen('home');
				});
			}

			if (currentScreen === 'history' && e.target.id === 'export-btn') {
				exportData();
			}

			// History tab buttons (7/14/30 days)
			if (currentScreen === 'history' && e.target.classList.contains('tab-btn')) {
				const days = parseInt(e.target.dataset.days) || 7;
				document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
				e.target.classList.add('active');
				// draw charts for chosen days
				drawCharts().then((fn) => fn(days));
			}

			if (e.target.classList.contains('journal-delete')) {
				const entryId = e.target.closest('.journal-entry').dataset.id;
				CyberSitDB.deleteJournal(entryId);
				renderScreen('history');
			}

			if (e.target.classList.contains('journal-expand')) {
				const entryEl = e.target.closest('.journal-entry');
				const entryId = entryEl.dataset.id;
				// fetch full journal entry and toggle preview/full text
				const journals = await CyberSitDB.getJournalEntries();
				const entry = journals.find(j => j.id === entryId);
				const previewEl = entryEl.querySelector('.journal-preview');
				if (!entry) return;
				const btn = e.target;
				if (btn.textContent.includes('Read More')) {
					previewEl.textContent = entry.text;
					btn.textContent = 'Read Less';
				} else {
					previewEl.textContent = entry.text.substring(0,100) + '...';
					btn.textContent = 'Read More';
				}
			}
		});

		document.addEventListener('change', (e) => {
			if (e.target.classList.contains('slider')) {
				const questionId = parseInt(e.target.dataset.question);
				assessmentResponses[questionId] = parseInt(e.target.value);
				// Update only the related slider value element
				const container = e.target.closest('.slider-container');
				if (container) {
					const valueEl = container.querySelector('.slider-value');
					if (valueEl) valueEl.textContent = e.target.value + (e.target.dataset.unit || '');
				} else {
					const globalVal = document.querySelector('.slider-value');
					if (globalVal) globalVal.textContent = e.target.value + (e.target.dataset.unit || '');
				}
				// avatar animations disabled for slider interactions
			}

			if (e.target.classList.contains('journal-textarea')) {
				const questionId = parseInt(e.target.dataset.question);
				assessmentResponses[questionId] = e.target.value;
				const charCount = document.getElementById('char-count');
				if (charCount) charCount.textContent = e.target.value.length;
			}

			if (e.target.id === 'prompts-per-day') {
				const display = document.getElementById('prompts-display');
				if (display) display.textContent = e.target.value;
			}
		});
	};

	const renderScreen = async (screen) => {
		currentScreen = screen;
		const mainContent = document.getElementById('main-content');
		let html = '';
		if (screen === 'home') {
			html = await UI.renderHome();
		} else if (screen === 'history') {
			html = await UI.renderHistory();
		} else if (screen === 'settings') {
			html = await UI.renderSettings();
		}
		mainContent.innerHTML = html;
		updateActiveTab(screen);
		// If we're on settings screen, populate schedule status and upcoming times
		if (screen === 'settings') {
			setTimeout(() => updateUpcomingTimesDisplay(), 100);
			// inject scheduling UI elements if not present
			setTimeout(() => {
				const settingsScreen = document.querySelector('.settings-screen');
				if (settingsScreen && !document.getElementById('schedule-status')) {
					const container = document.createElement('div');
					container.className = 'settings-section';
					const notifStatus = (typeof Notification !== 'undefined') ? Notification.permission : 'unavailable';
					container.innerHTML = `<h3>Scheduling</h3><div id="schedule-status" class="status status--info">Scheduling runs while the app is open.</div><div id="notifications-status" style="margin-top:6px;color:var(--color-text-secondary);">Notifications: ${notifStatus}</div><div id="upcoming-times" style="margin-top:8px;color:var(--color-text-secondary);"></div><button class="btn btn-secondary" id="reschedule-btn" style="margin-top:8px">Reschedule Now</button>`;
					settingsScreen.appendChild(container);
					updateUpcomingTimesDisplay();
				}
			}, 200);
		}

		// If we're on home screen, update home controls (progress, start button)
		if (screen === 'home') {
			setTimeout(() => updateHomeControls(), 120);
		}
		if (screen === 'history') {
			setTimeout(() => {
				drawCharts().then((fn) => fn(7));
			}, 100);
		}
	};

	const updateActiveTab = (screen) => {
		document.querySelectorAll('.nav-tab').forEach((tab) => {
			tab.classList.remove('active');
		});
		document.querySelector(`[data-screen="${screen}"]`)?.classList.add('active');
	};

	const startAssessment = async () => {
		// Prevent starting if outside schedule or prompts completed
		const settings = await CyberSitDB.getSettings();
		const todayAssessments = await CyberSitDB.getTodayAssessments();
		const promptsPerDay = settings.prompts_per_day || 5;
		const completed = todayAssessments.length;
		const nowHour = new Date().getHours();
		const inWindow = (nowHour >= (settings.assessment_start_hour||8)) && (nowHour <= (settings.assessment_end_hour||22));
		if (completed >= promptsPerDay) {
			alert('You have already completed today\'s assessments.');
			return;
		}
		if (!inWindow) {
			alert(`Assessments are allowed between ${settings.assessment_start_hour}:00 and ${settings.assessment_end_hour}:00`);
			return;
		}
		assessmentResponses = {};
		assessmentQuestionIndex = 0;
		renderAssessmentScreen();
	};

	const renderAssessmentScreen = async () => {
		currentScreen = 'assessment';
		const mainContent = document.getElementById('main-content');
		const html = UI.renderAssessment(assessmentQuestionIndex, assessmentResponses);
		mainContent.innerHTML = html;
		setTimeout(() => {
			document.querySelector('.assessment-screen')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 100);
		// animate avatar in assessment
		// No avatar animations (disabled per user request)
	};

	const nextQuestion = async () => {
		const question = UI.QUESTIONS[assessmentQuestionIndex];
		if (question.type !== 'textarea') {
			if (assessmentResponses[question.id] === undefined) {
				alert('Please answer this question before continuing.');
				return;
			}
		}
		assessmentQuestionIndex++;
		const hour = new Date().getHours();
		let questionToShow = assessmentQuestionIndex;
		while (questionToShow < UI.QUESTIONS.length && UI.QUESTIONS[questionToShow].evening_only && hour < 20) {
			questionToShow++;
		}
		if (questionToShow >= UI.QUESTIONS.length) {
			completeAssessment();
		} else {
			assessmentQuestionIndex = questionToShow;
			renderAssessmentScreen();
		}
	};

	const prevQuestion = async () => {
		if (assessmentQuestionIndex > 0) {
			assessmentQuestionIndex--;
			renderAssessmentScreen();
		}
	};

	const skipQuestion = async () => {
		assessmentQuestionIndex++;
		renderAssessmentScreen();
	};

	const selectChoice = (button) => {
		document.querySelectorAll('.choice-btn').forEach((b) => b.classList.remove('selected'));
		button.classList.add('selected');
		const questionId = parseInt(button.dataset.question);
		assessmentResponses[questionId] = button.dataset.value;
		// avatar animations disabled
	};

	const completeAssessment = async () => {
		const assessment = {
			participant_id: (await CyberSitDB.getSettings()).participant_id,
			responses: assessmentResponses,
			compliance_status: 'completed',
		};
		await CyberSitDB.saveAssessment(assessment);
		if (assessmentResponses[13]) {
			await CyberSitDB.saveJournal({ participant_id: assessment.participant_id, text: assessmentResponses[13] });
		}
		const mainContent = document.getElementById('main-content');
		mainContent.innerHTML = `
			<div class="completion-screen">
				<div class="completion-avatar">
					<svg viewBox="0 0 200 200" class="avatar-celebrating"> ... </svg>
					<div class="confetti"></div>
				</div>
				<h2>Great Job!</h2>
				<p>Your assessment has been saved.</p>
				<button class="btn btn-primary" id="return-home">Return to Home</button>
			</div>`;
		document.getElementById('return-home').addEventListener('click', () => {
			renderScreen('home');
		});
	};

	const saveSettings = async () => {
		const settings = {
			participant_id: document.getElementById('participant-id').value,
			assessment_start_hour: parseInt(document.getElementById('start-hour').value),
			assessment_end_hour: parseInt(document.getElementById('end-hour').value),
			prompts_per_day: parseInt(document.getElementById('prompts-per-day').value),
			step_goal: 8000,
			screen_tracking_enabled: document.getElementById('screen-tracking').checked,
			step_logging_enabled: document.getElementById('step-logging').checked,
			notifications_enabled: true,
		};
		await CyberSitDB.saveSettings(settings);
		alert('Settings saved!');
		renderScreen('home');
	};

	const drawCharts = async () => {
		return async function(days = 7) {
			const moodData = await ChartModule.getMoodData(days);
			const energyData = await ChartModule.getEnergyData(days);
			const stepsData = await ChartModule.getStepsData(days);
			ChartModule.drawChart('moodChart', 'Mood Trend', moodData, '#87CEEB');
			ChartModule.drawChart('energyChart', 'Energy Trend', energyData, '#ADD8E6');
			ChartModule.drawChart('stepsChart', 'Steps Trend', stepsData, '#2E7D32');
		};
	};

	const exportData = async () => {
		const csv = await ExportModule.generateCSV();
		ExportModule.downloadFile(csv, 'cybersit-data.csv', 'text/csv');
	};

	const showConfirmDialog = (title, message, onConfirm) => {
		const modal = document.getElementById('modal-confirm');
		document.getElementById('modal-title').textContent = title;
		document.getElementById('modal-message').textContent = message;
		document.getElementById('modal-confirm').onclick = () => {
			onConfirm();
			modal.classList.add('hidden');
		};
		document.getElementById('modal-cancel').onclick = () => {
			modal.classList.add('hidden');
		};
		modal.classList.remove('hidden');
	};

	// In-page Scheduler: schedules prompts (notifications or in-app dialog)
	const Scheduler = (() => {
		let timers = [];
		let scheduledForDate = '';

		const init = async () => {
			// Schedule immediately using current settings
			await scheduleFromSettings();
			// Re-schedule on visibility change (user returns) to catch missed updates
			document.addEventListener('visibilitychange', () => {
				if (!document.hidden) scheduleFromSettings();
			});
			// Re-schedule at midnight (check every minute for date change)
			setInterval(() => {
				const today = new Date().toDateString();
				if (scheduledForDate !== today) scheduleFromSettings();
			}, 60 * 1000);
		};

		const clearScheduled = () => {
			timers.forEach((id) => clearTimeout(id));
			timers = [];
		};

		const scheduleFromSettings = async () => {
			clearScheduled();
			const settings = await CyberSitDB.getSettings();
			if (!settings) return;
			// Request notification permission if enabled but not yet granted
			if (settings.notifications_enabled && 'Notification' in window && Notification.permission !== 'granted') {
				try {
					Notification.requestPermission();
				} catch (err) {
					// ignore
				}
			}
			const times = generatePromptTimes(settings);
			scheduledForDate = new Date().toDateString();
			const now = Date.now();
			times.forEach((t, idx) => {
				const ms = t.getTime() - now;
				if (ms <= 0) return; // skip past times
				const id = setTimeout(() => triggerPrompt(settings, t, idx + 1), ms);
				timers.push(id);
			});
		};

		const generatePromptTimes = (settings) => {
			const startHour = Number.isFinite(settings.assessment_start_hour) ? settings.assessment_start_hour : 8;
			const endHour = Number.isFinite(settings.assessment_end_hour) ? settings.assessment_end_hour : 22;
			const prompts = settings.prompts_per_day || 5;
			const today = new Date();
			const times = [];
			const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, 0, 0, 0);
			const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, 0, 0, 0);
			if (end <= start) return times;
			// Generate prompts_per_day random times evenly distributed windows
			for (let i = 0; i < prompts; i++) {
				const frac = (i + 0.5) / prompts; // avoid edges
				const t = new Date(start.getTime() + frac * (end.getTime() - start.getTime()));
				// Jitter +/- up to 10% of interval
				const jitter = (Math.random() - 0.5) * 0.2 * (end.getTime() - start.getTime()) / prompts;
				times.push(new Date(t.getTime() + jitter));
			}
			// sort ascending
			return times.sort((a, b) => a - b);
		};

		const triggerPrompt = (settings, time, sequence) => {
			const title = 'CyberSit Assessment';
			const body = `Prompt ${sequence} — Please complete a quick assessment.`;
			if (settings.notifications_enabled && 'Notification' in window && Notification.permission === 'granted') {
				try {
					const n = new Notification(title, { body, tag: `cybersit-prompt-${time.getTime()}` });
					n.onclick = () => {
						window.focus();
						startAssessment();
						n.close();
					};
				} catch (err) {
					// fallback to in-app dialog
					showInAppPrompt();
				}
			} else {
				// show in-app confirm dialog
				showInAppPrompt();
			}
		};

		const showInAppPrompt = () => {
			showConfirmDialog('Time for an assessment', 'It\'s time to do a short assessment. Start now?', () => {
				startAssessment();
			});
		};

		const getUpcomingTimes = async () => {
			const settings = await CyberSitDB.getSettings();
			if (!settings) return [];
			return generatePromptTimes(settings);
		};

		return { init, clearScheduled, reschedule: scheduleFromSettings, getUpcomingTimes };
	})();

	// Update schedule UI (upcoming times) when on settings screen
	const updateUpcomingTimesDisplay = async () => {
		if (currentScreen !== 'settings') return;
		const upcomingEl = document.getElementById('upcoming-times');
		const notifEl = document.getElementById('notifications-status');
		const statusEl = document.getElementById('schedule-status');
		if (notifEl) notifEl.textContent = 'Notifications: ' + (typeof Notification !== 'undefined' ? Notification.permission : 'unavailable');
		if (!upcomingEl) return;
		const times = await Scheduler.getUpcomingTimes();
		const now = Date.now();
		const future = times.filter(t => t.getTime() > now).slice(0, 8);
		if (future.length === 0) {
			upcomingEl.textContent = 'No upcoming prompts scheduled for today.';
		} else {
			upcomingEl.innerHTML = '<strong>Upcoming prompts:</strong><br>' + future.map(t => t.toLocaleTimeString()).join(', ');
		}
		if (statusEl) statusEl.textContent = 'Scheduling runs while the app is open.';
	};

	const updateHomeControls = async () => {
		const settings = await CyberSitDB.getSettings();
		const todayAssessments = await CyberSitDB.getTodayAssessments();
		const promptsPerDay = settings.prompts_per_day || 5;
		const completed = todayAssessments.length;
		const nowHour = new Date().getHours();
		const inWindow = (nowHour >= (settings.assessment_start_hour||8)) && (nowHour <= (settings.assessment_end_hour||22));
		const progressText = document.querySelector('.progress-text');
		if (progressText) progressText.textContent = `${completed}/${promptsPerDay}`;
		const progressFill = document.getElementById('progress-fill');
		if (progressFill) {
			const progressDash = 251.2 * Math.min(completed, promptsPerDay) / Math.max(promptsPerDay,1);
			progressFill.style.strokeDasharray = progressDash;
		}
		// Update assessments metric value
		const metricCards = Array.from(document.querySelectorAll('.metric-card'));
		for (const card of metricCards) {
			const label = card.querySelector('.metric-label');
			const value = card.querySelector('.metric-value');
			if (!label || !value) continue;
			if (label.textContent.includes('Assessments Completed')) {
				value.textContent = `${completed} / ${promptsPerDay}`;
			}
		}
		// Update start button state and show note
		const startBtn = document.getElementById('start-assessment');
		if (startBtn) {
			if (completed >= promptsPerDay || !inWindow) {
				startBtn.setAttribute('disabled','');
			} else {
				startBtn.removeAttribute('disabled');
			}
		}
		let noteEl = document.getElementById('home-start-note');
		if (!noteEl) {
			noteEl = document.createElement('div');
			noteEl.id = 'home-start-note';
			noteEl.className = 'metric-card';
			document.querySelector('.metrics-section')?.appendChild(noteEl);
		}
		if (completed >= promptsPerDay) noteEl.innerHTML = `<div class="metric-label">Assessment Limit</div><div class="metric-value">You've completed today's ${promptsPerDay} prompts.</div>`;
		else if (!inWindow) noteEl.innerHTML = `<div class="metric-label">Outside Schedule</div><div class="metric-value">Assessments allowed between ${settings.assessment_start_hour}:00 and ${settings.assessment_end_hour}:00</div>`;
		else noteEl.innerHTML = '';
	};

	return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
	App.init();
});