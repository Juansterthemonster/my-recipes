// Run: node scripts/test-import-recipe.mjs
import assert from 'node:assert/strict'
import { extractRecipe, parseDuration, decodeEntities } from '../api/_lib/recipeFromHtml.js'
import { isPrivateAddress, checkUrl, fetchPage } from '../api/_lib/safeFetch.js'

const page = ld => `<html><head><meta property="og:site_name" content="Test Kitchen"><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body></body></html>`

// durations
assert.equal(parseDuration('PT1H30M'), 90); assert.equal(parseDuration('PT45M'), 45)
assert.equal(parseDuration('P0DT20M'), 20); assert.equal(parseDuration('P1DT2H'), 1560)
assert.equal(parseDuration('PT0M'), null); assert.equal(parseDuration('about 5 min'), null)
assert.equal(decodeEntities('Mac &amp; cheese &#8211; &#x27;yum&#x27; &frac12;'), "Mac & cheese – 'yum' ½")

// 1. typical blog: @graph, HowToStep, yield array, entities
let r = extractRecipe(page({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebSite', name: 'x' },
  { '@type': ['Recipe'], name: 'Best Pancakes &amp; Syrup', description: '<p>Fluffy.</p>', prepTime: 'PT10M', cookTime: 'PT15M',
    recipeYield: ['4', '4 servings'], recipeCuisine: 'American',
    recipeIngredient: ['1 1/2 cups flour', '2 tbsp sugar', '1 cup milk&nbsp;'],
    recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix dry.' }, { '@type': 'HowToStep', text: 'Add milk.<br>Stir.' }] }] }))
assert.equal(r.name, 'Best Pancakes & Syrup'); assert.equal(r.description, 'Fluffy.')
assert.deepEqual(r.ingredients, ['1 1/2 cups flour', '2 tbsp sugar', '1 cup milk'])
assert.deepEqual(r.steps, ['Mix dry.', 'Add milk.', 'Stir.'])
assert.equal(r.serves, 4); assert.equal(r.activeMins, 10); assert.equal(r.totalMins, 25); assert.equal(r.cuisine, 'American'); assert.equal(r.siteName, 'Test Kitchen')

// 2. sections + plain-string instructions + numeric yield + explicit totalTime
r = extractRecipe(page({ '@type': 'Recipe', name: 'Soup', recipeYield: 6, totalTime: 'PT1H', recipeIngredient: ['water'],
  recipeInstructions: [{ '@type': 'HowToSection', name: 'Base', itemListElement: [{ '@type': 'HowToStep', text: 'Boil.' }] }, 'Season.'] }))
assert.deepEqual(r.steps, ['Boil.', 'Season.']); assert.equal(r.serves, 6); assert.equal(r.totalMins, 60); assert.equal(r.activeMins, null)

// 3. instructions as one newline-separated string
r = extractRecipe(page({ '@type': 'Recipe', name: 'Toast', recipeIngredient: ['bread'], recipeInstructions: 'Slice.\nToast.\n\nServe.' }))
assert.deepEqual(r.steps, ['Slice.', 'Toast.', 'Serve.'])

// 4. no recipe / empty recipe / broken JSON / not JSON-LD
assert.equal(extractRecipe('<html><body>hi</body></html>'), null)
assert.equal(extractRecipe(page({ '@type': 'Article', name: 'Blog' })), null)
assert.equal(extractRecipe(page({ '@type': 'Recipe', name: 'Empty' })), null)
assert.equal(extractRecipe('<script type="application/ld+json">{ oops </script>'), null)

// 5. a bad block before a good one is skipped
r = extractRecipe('<script type="application/ld+json">{bad</script>' + page({ '@type': 'Recipe', name: 'Ok', recipeIngredient: ['a'] }))
assert.equal(r.name, 'Ok')

// address guard
for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '224.0.0.1'])
  assert.ok(isPrivateAddress(ip), ip)
for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111']) assert.ok(!isPrivateAddress(ip), ip)

// url guard
for (const bad of ['ftp://example.com/x', 'http://127.0.0.1/', 'http://localhost/', 'http://[::1]/', 'http://2130706433/', 'https://user:pw@example.com/', 'https://example.com:8080/', 'javascript:alert(1)', 'not a url', 'http://intranet/'])
  assert.throws(() => checkUrl(bad), /invalid_url/, bad)
checkUrl('https://www.example.com/recipe?id=1')

// fetch refuses internal targets before any request leaves
for (const bad of ['http://localhost/', 'http://127.0.0.1:80/', 'http://metadata.google.internal/', 'http://169.254.169.254/'])
  await assert.rejects(() => fetchPage(bad))
console.log('all import-recipe checks passed')
