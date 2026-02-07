document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section, header');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            navbar.classList.toggle('nav-open');
        });
    }

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            navbar.classList.remove('nav-open');
        });
    });

    const onScroll = () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', onScroll);
    onScroll();

    const revealItems = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.2 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    const sectionObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach((link) => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        },
        { threshold: 0.45 }
    );

    sections.forEach((section) => {
        if (section.getAttribute('id')) {
            sectionObserver.observe(section);
        }
    });

    const roiForm = document.getElementById('roiForm');
    if (roiForm) {
        const fmtEuro = new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        });
        const fmtNum = new Intl.NumberFormat('nl-NL', {
            maximumFractionDigits: 0
        });

        const savingsEl = document.getElementById('roiSavings');
        const hoursEl = document.getElementById('roiHours');
        const paybackEl = document.getElementById('roiPayback');
        const adminPanelEl = document.getElementById('roiAdminPanel');
        const resetAssumptionsEl = document.getElementById('roiResetAssumptions');

        const assumptionDefaults = {
            assumeBaseHours: 1.45,
            assumeTimeReduction: 32,
            assumeEnergySpend: 17.5,
            assumeEnergyReduction: 12,
            assumeBaseSub: 299,
            assumePerLocation: 95
        };

        const url = new URL(window.location.href);
        const adminMode = url.searchParams.get('admin') === '1';
        if (adminMode && adminPanelEl) {
            adminPanelEl.hidden = false;
        }

        const recalcRoi = () => {
            const locations = Math.max(1, Number(roiForm.locations.value) || 1);
            const meters = Math.max(500, Number(roiForm.meters.value) || 500);
            const ticketsMonthly = Math.max(10, Number(roiForm.tickets.value) || 10);
            const hourlyCost = Math.max(20, Number(roiForm.hourlyCost.value) || 20);

            const baseHoursPerTicket = Math.max(0.2, Number(roiForm.assumeBaseHours.value) || assumptionDefaults.assumeBaseHours);
            const timeReduction = Math.max(0.01, Math.min(0.8, (Number(roiForm.assumeTimeReduction.value) || assumptionDefaults.assumeTimeReduction) / 100));
            const yearlyHoursSaved = ticketsMonthly * 12 * baseHoursPerTicket * timeReduction;

            const energySpendPerM2 = Math.max(1, Number(roiForm.assumeEnergySpend.value) || assumptionDefaults.assumeEnergySpend);
            const energyReduction = Math.max(0.01, Math.min(0.6, (Number(roiForm.assumeEnergyReduction.value) || assumptionDefaults.assumeEnergyReduction) / 100));
            const yearlyEnergySaved = meters * energySpendPerM2 * energyReduction;

            const yearlyLaborSaved = yearlyHoursSaved * hourlyCost;
            const totalYearlySavings = yearlyLaborSaved + yearlyEnergySaved;

            const monthlyBaseSubscription = Math.max(0, Number(roiForm.assumeBaseSub.value) || assumptionDefaults.assumeBaseSub);
            const monthlyPerLocation = Math.max(0, Number(roiForm.assumePerLocation.value) || assumptionDefaults.assumePerLocation);
            const monthlySubscription = monthlyBaseSubscription + locations * monthlyPerLocation;
            const paybackMonths = Math.max(1, Math.round((monthlySubscription * 12 / totalYearlySavings) * 12));

            savingsEl.textContent = fmtEuro.format(totalYearlySavings);
            hoursEl.textContent = `${fmtNum.format(yearlyHoursSaved)} uur`;
            paybackEl.textContent = `${fmtNum.format(paybackMonths)} maanden`;
        };

        if (resetAssumptionsEl) {
            resetAssumptionsEl.addEventListener('click', () => {
                Object.entries(assumptionDefaults).forEach(([key, value]) => {
                    roiForm[key].value = String(value);
                });
                recalcRoi();
            });
        }

        roiForm.addEventListener('input', recalcRoi);
        recalcRoi();
    }

    const dashboardScope = document.getElementById('dashboardScope');
    const trendChart = document.getElementById('trendChart');
    const trendSummary = document.getElementById('trendSummary');
    const liveStamp = document.getElementById('dashboardLiveStamp');
    const eventFeed = document.getElementById('eventFeed');

    if (dashboardScope && trendChart && trendSummary && liveStamp && eventFeed) {
        const kpiTickets = document.getElementById('kpiTickets');
        const kpiTicketsDelta = document.getElementById('kpiTicketsDelta');
        const kpiResolve = document.getElementById('kpiResolve');
        const kpiResolveDelta = document.getElementById('kpiResolveDelta');
        const kpiEnergy = document.getElementById('kpiEnergy');
        const kpiEnergyDelta = document.getElementById('kpiEnergyDelta');
        const kpiSla = document.getElementById('kpiSla');
        const kpiSlaDelta = document.getElementById('kpiSlaDelta');

        const scopeProfiles = {
            all: { tickets: 68, resolve: 116, energy: 82, sla: 98.6 },
            office: { tickets: 42, resolve: 101, energy: 86, sla: 99.1 },
            logistics: { tickets: 77, resolve: 129, energy: 80, sla: 97.8 },
            residential: { tickets: 55, resolve: 111, energy: 84, sla: 98.2 }
        };

        const eventTemplates = [
            'HVAC reset uitgevoerd op CityPoint.',
            'Schoonmaak-ticket automatisch toegewezen.',
            'Energiepiek gedetecteerd op verdieping 3.',
            'Liftinspectie afgerond zonder afwijkingen.',
            'Preventief onderhoud geactiveerd voor pomp B2.',
            'Sensor offline: vergaderruimte North-14.'
        ];

        let trendSeries = [64, 59, 62, 60, 57, 52, 48, 53, 49, 46, 44, 41];
        let current = { ...scopeProfiles.all };

        const rnd = (min, max) => Math.random() * (max - min) + min;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const updateKpis = () => {
            const base = scopeProfiles[dashboardScope.value] || scopeProfiles.all;
            current.tickets = Math.round(clamp(base.tickets + rnd(-6, 6), 18, 140));
            current.resolve = Math.round(clamp(base.resolve + rnd(-10, 8), 60, 190));
            current.energy = Math.round(clamp(base.energy + rnd(-3, 3), 60, 99));
            current.sla = Number(clamp(base.sla + rnd(-0.6, 0.6), 93.5, 99.9).toFixed(1));

            kpiTickets.textContent = String(current.tickets);
            kpiResolve.textContent = String(current.resolve);
            kpiEnergy.textContent = String(current.energy);
            kpiSla.textContent = String(current.sla);

            kpiTicketsDelta.textContent = `${Math.round(rnd(-8, 11))} vs gisteren`;
            kpiResolveDelta.textContent = `${Math.round(rnd(-14, 9))}% verandering`;
            kpiEnergyDelta.textContent = `${Math.round(rnd(7, 21))}% besparing`;
            kpiSlaDelta.textContent = `${Math.max(0, Math.round(rnd(0, 3)))} kritieke alerts`;
        };

        const renderTrend = () => {
            const width = 600;
            const height = 190;
            const pad = 16;
            const min = Math.min(...trendSeries) - 4;
            const max = Math.max(...trendSeries) + 4;

            const points = trendSeries.map((v, i) => {
                const x = pad + (i * (width - pad * 2)) / (trendSeries.length - 1);
                const y = height - pad - ((v - min) * (height - pad * 2)) / (max - min || 1);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            });

            const areaPoints = [`${pad},${height - pad}`, ...points, `${width - pad},${height - pad}`].join(' ');
            const last = trendSeries[trendSeries.length - 1];
            const prev = trendSeries[trendSeries.length - 2] || last;
            trendSummary.textContent = last <= prev ? 'dalende ticketdruk' : 'licht stijgend';

            trendChart.innerHTML = `
                <polyline points="${areaPoints}" fill="rgba(10,147,150,0.16)" stroke="none"></polyline>
                <polyline points="${points.join(' ')}" fill="none" stroke="#0a9396" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></polyline>
            `;
        };

        const addEvent = () => {
            const scopeLabel = dashboardScope.options[dashboardScope.selectedIndex].text;
            const item = document.createElement('li');
            const stamp = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            item.textContent = `[${stamp}] ${scopeLabel}: ${eventTemplates[Math.floor(Math.random() * eventTemplates.length)]}`;
            eventFeed.prepend(item);
            while (eventFeed.children.length > 6) {
                eventFeed.removeChild(eventFeed.lastChild);
            }
            liveStamp.textContent = stamp;
        };

        const tickDashboard = () => {
            updateKpis();
            trendSeries.push(Math.round(clamp(current.tickets + rnd(-4, 4), 18, 140)));
            if (trendSeries.length > 12) {
                trendSeries.shift();
            }
            renderTrend();
            addEvent();
        };

        dashboardScope.addEventListener('change', () => {
            const base = scopeProfiles[dashboardScope.value] || scopeProfiles.all;
            trendSeries = Array.from({ length: 12 }, (_, i) => Math.round(base.tickets + Math.sin(i / 1.8) * 6 + rnd(-3, 3)));
            tickDashboard();
        });

        tickDashboard();
        window.setInterval(tickDashboard, 3500);
    }
});
