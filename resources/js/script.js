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
});
