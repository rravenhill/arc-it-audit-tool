const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipToInt(ip) {
  const match = IPV4_REGEX.exec(String(ip).trim());
  if (!match) return null;
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((o) => o < 0 || o > 255)) return null;
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function prefixToMask(prefix) {
  if (prefix <= 0) return '0.0.0.0';
  if (prefix >= 32) return '255.255.255.255';
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return [24, 16, 8, 0].map((shift) => (mask >>> shift) & 255).join('.');
}

// Every valid IPv4 subnet mask, most specific (/32) to least specific (/0) - the order
// masks are conventionally listed in. Displayed/stored as "255.255.255.0 /24".
export const SUBNET_MASK_OPTIONS = Array.from({ length: 33 }, (_, i) => 32 - i).map((prefix) => {
  const value = `${prefixToMask(prefix)} /${prefix}`;
  return { value, label: value };
});

export function validateGatewayInSubnet(network, subnetValue, gateway) {
  // Only validate once all three inputs are present - don't flag a row the user hasn't
  // finished filling in yet.
  if (!network || !subnetValue || !gateway) return null;

  const networkInt = ipToInt(network);
  if (networkInt === null) return 'Network is not a valid IPv4 address.';

  const gatewayInt = ipToInt(gateway);
  if (gatewayInt === null) return 'Gateway is not a valid IPv4 address.';

  const maskInt = ipToInt(String(subnetValue).split('/')[0]);
  if (maskInt === null) return null;

  if ((networkInt & maskInt) !== (gatewayInt & maskInt)) {
    return 'Gateway is not within the Network/Subnet range.';
  }
  return null;
}
