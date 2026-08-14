// ---- curriculum data (from repo +page.svelte) ----
const COURSES = [
	{ n: '01', title: 'Managing Unknown Contacts (MUC)', preview: true },
	{ n: '02', title: 'Base & Strategy for Wrestling in a Weapons-Based Environment' },
	{ n: '03', title: 'ShivWorks Entangled Shooting — Live Fire Module', vip: true },
	{ n: '04', title: 'Clinch Pick Application' },
	{ n: '05', title: 'Push Dagger Application' },
	{ n: '06', title: 'Foundational Modules — Origin Story + CAP' },
	{ n: '07', title: 'ShivWorks Core Skills' },
	{ n: '08', title: 'Physical Confrontation Confirmed (PCC)' },
	{ n: '09', title: 'Grounded Strategy for a Weapons-Based Environment' },
	{ n: '10', title: 'ShivWorks Edged Weapons Overview' },
	{ n: '11', title: 'Handgun IFWA, Retention, Recovery & Disarming', vip: true }
];
document.getElementById('course-grid').innerHTML = COURSES.map(
	(c) => `
    <a class="panel course-card" href="library.html">
      <div class="media-ph">
        <div class="media-ph-inner">
          <svg style="width:1.4rem;height:1.4rem;color:var(--color-accent)"><use href="#i-play"></use></svg>
          <span class="media-ph-label">[ Course ${c.n} ]</span>
        </div>
      </div>
      <div class="course-card-body">
        <div class="course-card-top">
          <span class="idx">${c.n}</span>
          ${c.preview ? '<span class="tag accent">Free preview</span>' : c.vip ? '<span class="tag brass">VIP</span>' : '<span class="tag muted">Member</span>'}
        </div>
        <h3>${c.title}</h3>
        <span class="ghost-link" style="margin-top:auto;">View details <svg><use href="#i-arrow"></use></svg></span>
      </div>
    </a>`
).join('');

// ---- testimonials (from repo) ----
const TESTIMONIALS = [
	{
		q: 'This ENTIRE class was phenomenal. Craig and Brian teach to the level of the student. Best class I have ever taken.',
		n: 'Heather H.',
		b: 'ECQC Graduate, Idaho'
	},
	{
		q: 'In 18+ years in law enforcement, I have never taken a better class. It focuses on challenges few other classes address realistically.',
		n: 'Chip T.',
		b: '18-Year LE Professional'
	},
	{
		q: 'One of the best courses in my 27-year Army career, majority in Special Forces. No wasted time. I am retraining my pistol draw from this.',
		n: 'Paul F.',
		b: '27-Year Army, Special Forces'
	},
	{
		q: 'Taking this course was one of the best decisions I have ever made. You leave with invaluable knowledge and confidence.',
		n: 'Alice M.',
		b: 'ECQC Graduate, Florida'
	},
	{
		q: 'After 30+ self-defense classes in two years, ECQC stands out. I know of none better than ECQC with Craig and Brian.',
		n: 'Nikolaus T.',
		b: '30+ Tactical Classes'
	},
	{
		q: 'The program attracts really great people. Thank you for sharing your knowledge so skillfully.',
		n: 'Jenn L.',
		b: 'BJJ Instructor, Washington'
	}
];
document.getElementById('testimonial-grid').innerHTML = TESTIMONIALS.map(
	(t) => `
    <div class="panel quote-card">
      <div class="stars">${'<svg><use href="#i-star"></use></svg>'.repeat(5)}</div>
      <blockquote>"${t.q}"</blockquote>
      <div class="quote-author"><span class="n">${t.n}</span><span class="b">${t.b} · Verified</span></div>
    </div>`
).join('');

// ---- faq (from repo) ----
const FAQS = [
	{
		q: 'What is the ShivWorks Network?',
		a: "Craig Douglas's complete ECQC curriculum, on demand. Courses, live sessions with Craig, and a private practitioner community."
	},
	{
		q: 'When do I get access?',
		a: 'Full platform access opens June 1, 2026. Founding Members are admitted on launch day.'
	},
	{
		q: "I've already taken ECQC in person. Is this for me?",
		a: 'Yes. The Network deepens and structures what you trained live. Many alumni use it to revisit specific concepts between courses.'
	},
	{
		q: 'Is this beginner-friendly?',
		a: 'Yes. The curriculum builds from foundations to advanced application. No prior martial arts or shooting background required.'
	},
	{
		q: 'How does Founding Member pricing work?',
		a: 'The price moves with spots, not a deadline. Each tier fills, then the price moves up. Once the founding window closes, founding pricing is gone.'
	},
	{
		q: 'Are purchases refundable?',
		a: 'Founding Member access is a one-time lifetime purchase. Purchases are final. Questions before buying: network@shivworks.com.'
	}
];
document.getElementById('faq-list').innerHTML = FAQS.map(
	(f) => `
    <div class="faq-item">
      <button class="faq-q"><span>${f.q}</span><svg><use href="#i-chevron"></use></svg></button>
      <div class="faq-a"><p>${f.a}</p></div>
    </div>`
).join('');
document.querySelectorAll('.faq-q').forEach((btn) => {
	btn.addEventListener('click', () => {
		const item = btn.closest('.faq-item');
		const wasOpen = item.classList.contains('open');
		document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
		if (!wasOpen) item.classList.add('open');
	});
});

// ---- GSAP hero entrance (reduced-motion aware; no-op if GSAP missing) ----
if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
	gsap.from('.hero-copy > *', {
		y: 18,
		opacity: 0,
		duration: 0.6,
		stagger: 0.08,
		ease: 'power3.out',
		delay: 0.08
	});
	gsap.from('.hero-media', {
		opacity: 0,
		scale: 0.98,
		duration: 0.7,
		ease: 'power2.out',
		delay: 0.2
	});
}
