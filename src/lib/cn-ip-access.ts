import ipaddr from "ipaddr.js";

import {
  CN_IPV4_RANGES_HEX,
  CN_IPV6_RANGES_HEX,
} from "@/generated/cn-ip-ranges";

type IpRange = readonly [start: bigint, end: bigint];

function parseRanges(source: string): IpRange[] {
  return source
    .trim()
    .split(/\s+/)
    .map((row) => {
      const [start, end] = row.split("-");
      return [BigInt(`0x${start}`), BigInt(`0x${end}`)] as const;
    });
}

const IPV4_RANGES = parseRanges(CN_IPV4_RANGES_HEX);
const IPV6_RANGES = parseRanges(CN_IPV6_RANGES_HEX);

function addressValue(address: ipaddr.IPv4 | ipaddr.IPv6) {
  return address
    .toByteArray()
    .reduce(
      (value, byte) => (value << BigInt(8)) | BigInt(byte),
      BigInt(0),
    );
}

function normalizedAddress(rawIp: string) {
  let value = rawIp.trim().replace(/^"|"$/g, "");

  if (value.startsWith("[")) {
    value = value.slice(1, value.indexOf("]"));
  } else if (value.includes(".") && value.split(":").length === 2) {
    value = value.split(":")[0];
  }

  value = value.split("%")[0];
  const address = ipaddr.parse(value);
  return address instanceof ipaddr.IPv6 && address.isIPv4MappedAddress()
    ? address.toIPv4Address()
    : address;
}

function contains(ranges: IpRange[], value: bigint) {
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = ranges[middle];

    if (value < start) high = middle - 1;
    else if (value > end) low = middle + 1;
    else return true;
  }

  return false;
}

export function isMainlandChinaIp(rawIp: string | null) {
  if (!rawIp) return false;

  try {
    const address = normalizedAddress(rawIp);
    return contains(
      address.kind() === "ipv4" ? IPV4_RANGES : IPV6_RANGES,
      addressValue(address),
    );
  } catch {
    return false;
  }
}
