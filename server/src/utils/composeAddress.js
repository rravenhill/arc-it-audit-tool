// Both customers and sites capture a standard UK address block (line 1/2, town/city, county,
// postcode) in the form, but everywhere else (address-copy prefill, map embeds, PDF/CSV/JSON
// exports) just wants one address string - so both routes compose that into a flat `address`
// column rather than every consumer having to know about the structured parts.
function composeAddress({ address_line1, address_line2, town_city, county, postcode }) {
  const parts = [address_line1, address_line2, town_city, county, postcode].filter((p) => p && p.trim());
  return parts.length ? parts.join(', ') : null;
}

module.exports = { composeAddress };
