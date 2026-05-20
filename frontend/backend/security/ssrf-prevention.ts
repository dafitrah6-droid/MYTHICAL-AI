import { promises as dns } from 'dns';

interface IpRange {
  min: bigint;
  max: bigint;
}

function ipToNumber(ip: string): bigint {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0n;
  return (BigInt(parts[0]) << 24n) | (BigInt(parts[1]) << 16n) | (BigInt(parts[2]) << 8n) | BigInt(parts[3]);
}

function isIpInRange(ip: string, range: IpRange): boolean {
  const num = ipToNumber(ip);
  return num >= range.min && num <= range.max;
}

function isIpv6Loopback(ip: string): boolean {
  return ip === '::1' || ip === '0000:0000:0000:0000:0000:0000:0000:0001';
}

const reservedRanges: IpRange[] = [
  // 0.0.0.0/8 - This Network
  { min: 0n, max: (1n << 24n) - 1n },
  // 10.0.0.0/8 - Private
  { min: BigInt('167772160'), max: BigInt('184549375') },
  // 127.0.0.0/8 - Loopback
  { min: BigInt('2130706432'), max: BigInt('2147483647') },
  // 169.254.0.0/16 - Link-local (includes 169.254.169.254 AWS metadata)
  { min: BigInt('2851995648'), max: BigInt('2852061183') },
  // 172.16.0.0/12 - Private
  { min: BigInt('2886729728'), max: BigInt('2887778303') },
  // 192.168.0.0/16 - Private
  { min: BigInt('3232235520'), max: BigInt('3232301055') },
  // 224.0.0.0/4 - Multicast
  { min: BigInt('3758096384'), max: BigInt('4026531839') },
  // 240.0.0.0/4 - Reserved
  { min: BigInt('4026531840'), max: BigInt('4294967295') },
];

export class SsrfPrevention {
  /**
   * Validates if a URL is safe to request from (not pointing to internal network).
   * Resolves hostname to IP and checks against reserved/private CIDR blocks.
   */
  static async isSafeUrl(urlString: string): Promise<boolean> {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname;

      // Check IPv6 loopback
      if (isIpv6Loopback(hostname)) {
        return false;
      }

      // If hostname is already an IPv4 address, validate directly
      if (this.isIpv4(hostname)) {
        return !this.isReservedIp(hostname);
      }

      // Resolve hostname to IP address with timeout
      let addresses: string[];
      try {
        addresses = await Promise.race([
          dns.resolve4(hostname),
          new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 5000))
        ]);
      } catch (error) {
        // DNS resolution failed or timed out - treat as unsafe
        return false;
      }

      if (addresses.length === 0) {
        return false;
      }

      // Check if any resolved IP is reserved/private
      for (const ip of addresses) {
        if (this.isReservedIp(ip)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // Invalid URL or other error - treat as unsafe
      return false;
    }
  }

  private static isIpv4(str: string): boolean {
    const parts = str.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && part === num.toString();
    });
  }

  private static isReservedIp(ip: string): boolean {
    if (!this.isIpv4(ip)) return false;
    return reservedRanges.some(range => this.isIpInRange(ip, range));
  }
}
