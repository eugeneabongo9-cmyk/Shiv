<script lang="ts">
	import {
		PRIMARY_NAV,
		SHIVWORKS_MAIN_SITE,
		SHIVWORKS_STORE_URL,
		SITE_NAME,
		SOCIAL_LINKS,
		SUPPORT_EMAIL
	} from '$lib/constants/site';
</script>

<footer class="site-footer">
	<div class="container">
		<div class="footer-inner">
			<div class="footer-brand">
				<a class="brand" href="/">
					<span class="brand-mark">
						<img src="/cobra-logo.png" alt="ShivWorks" width="42" height="42" />
					</span>
					<span class="brand-copy">
						<strong>ShivWorks</strong>
						<span>The Network</span>
					</span>
				</a>
				<p>
					The private training platform for {SITE_NAME} members. Craig Douglas's complete ECQC curriculum,
					online.
				</p>
			</div>

			<div class="footer-block">
				<h4>Platform</h4>
				{#each PRIMARY_NAV as item}
					<a href={item.href}>{item.label}</a>
				{/each}
				<a href="/checkout">Founding access</a>
			</div>

			<div class="footer-block">
				<h4>Network</h4>
				<a href="#curriculum">Curriculum</a>
				<a href="#faq">FAQ</a>
				<a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
				<a href={SHIVWORKS_MAIN_SITE} target="_blank" rel="noreferrer">ShivWorks.com</a>
				<a href={SHIVWORKS_STORE_URL} target="_blank" rel="noreferrer">Products Group</a>
			</div>

			<div class="footer-block">
				<h4>Follow</h4>
				{#each SOCIAL_LINKS as item}
					<a href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
				{/each}
			</div>
		</div>

		<div class="fda-card">
			Founding Member access is a one-time lifetime purchase. Production and launch of the ShivWorks
			Network are contingent upon meeting a minimum enrollment threshold during the pre-sale period.
			If the threshold is not met, all purchasers are eligible for a full refund.
		</div>

		<div class="footer-legal">
			<span>© {new Date().getFullYear()} ShivWorks</span>
			<span>theshivworksnetwork.com · shivworks.com</span>
		</div>
	</div>
</footer>
