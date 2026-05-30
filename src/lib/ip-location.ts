export interface IPInfo {
    country: string;
    regionName: string;
    city: string;
    isp: string;
    as: string;
    status: string;
}

export async function getLocation(ip: string): Promise<{ location: string, isp?: string }> {
    // Normalize IPv4-mapped IPv6 address
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    // Local IP or unknown check
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown') {
        return { location: '本地', isp: '本地网络' };
    }

    // Checking for private IPs
    const parts = ip.split('.');
    if (parts.length === 4) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);
        if (
            first === 10 ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168)
        ) {
            return { location: '局域网 IP' };
        }
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return { location: '' };
        }

        const data = await response.json() as IPInfo;
        if (data.status !== 'success') {
            return { location: '' };
        }

        // Format: "中国江苏苏州"
        const locationParts = [data.country, data.regionName, data.city].filter(Boolean);
        const uniqueLocation = [...new Set(locationParts)];

        const isChinese = uniqueLocation.some(part => /[一-龥]/.test(part));
        const locationStr = uniqueLocation.join(isChinese ? '' : ' ');

        let ispName = '';

        if (data.isp) {
            let isp = data.isp;
            const ispLower = isp.toLowerCase();

            const ISP_MAPPINGS = [
                // 国内主要运营商
                { keywords: ['telecom', 'chinanet', 'china telecom'], name: '中国电信' },
                { keywords: ['mobile', 'china mobile'], name: '中国移动' },
                { keywords: ['unicom', 'china unicom'], name: '中国联通' },
                { keywords: ['cernet', 'education', 'university'], name: '教育网' },
                { keywords: ['cstnet', 'science', 'academy of sciences'], name: '科技网' },
                { keywords: ['dr.peng', 'dr peng', 'great wall', 'gwbn'], name: '长城宽带/鹏博士' },
                { keywords: ['wasu'], name: '华数宽带' },
                { keywords: ['gehua'], name: '歌华有线' },
                { keywords: ['oriental', 'ocn'], name: '东方有线' },
                { keywords: ['broadcasting', 'tv', 'guangdian'], name: '广电网络' },
                { keywords: ['topway'], name: '天威视讯' },

                // 国内云服务商
                { keywords: ['alibaba', 'aliyun'], name: '阿里云' },
                { keywords: ['tencent'], name: '腾讯云' },
                { keywords: ['huawei'], name: '华为云' },
                { keywords: ['baidu'], name: '百度云' },
                { keywords: ['kingsoft', 'ksyun'], name: '金山云' },
                { keywords: ['jd', 'jingdong'], name: '京东云' },
                { keywords: ['ucloud'], name: 'UCloud' },
                { keywords: ['qingcloud'], name: '青云' },
                { keywords: ['volcengine', 'bytedance'], name: '火山引擎' },

                // 国外云服务商
                { keywords: ['amazon', 'aws'], name: 'AWS' },
                { keywords: ['google', 'google cloud'], name: 'Google Cloud' },
                { keywords: ['microsoft', 'azure'], name: 'Azure' },
                { keywords: ['cloudflare'], name: 'Cloudflare' },
                { keywords: ['oracle'], name: 'Oracle Cloud' },
                { keywords: ['digitalocean'], name: 'DigitalOcean' },
                { keywords: ['linode', 'akamai'], name: 'Linode/Akamai' },
                { keywords: ['dmit'], name: 'DMIT' },
                { keywords: ['vultr', 'choopa'], name: 'Vultr' },
                { keywords: ['hetzner'], name: 'Hetzner' },
                { keywords: ['ovh'], name: 'OVH' },
                { keywords: ['contabo'], name: 'Contabo' },
                { keywords: ['racknerd'], name: 'Racknerd' },
                { keywords: ['bandwagon', 'it7'], name: '搬瓦工' },
                { keywords: ['zenlayer'], name: 'Zenlayer' },
                { keywords: ['gcore'], name: 'Gcore' },

                // 亚洲运营商
                { keywords: ['pccw', 'hkt'], name: 'PCCW/HKT' },
                { keywords: ['hgc'], name: 'HGC' },
                { keywords: ['cmi', 'china mobile international'], name: '中国移动国际' },
                { keywords: ['cug', 'china unicom global'], name: '中国联通国际' },
                { keywords: ['ctg', 'china telecom global'], name: '中国电信国际' },
                { keywords: ['chunghwa', 'hinet'], name: '中华电信' },
                { keywords: ['kddi'], name: 'KDDI' },
                { keywords: ['softbank'], name: 'SoftBank' },
                { keywords: ['ntt'], name: 'NTT' },
                { keywords: ['iij'], name: 'IIJ' },
                { keywords: ['korea telecom', 'kt corporation'], name: 'KT' },
                { keywords: ['sk telecom'], name: 'SK Telecom' },
                { keywords: ['lg uplus', 'lg u+'], name: 'LG U+' },
                { keywords: ['singtel'], name: 'Singtel' },
                { keywords: ['starhub'], name: 'StarHub' },

                // 欧美运营商
                { keywords: ['comcast'], name: 'Comcast' },
                { keywords: ['att', 'at&t'], name: 'AT&T' },
                { keywords: ['verizon'], name: 'Verizon' },
                { keywords: ['t-mobile'], name: 'T-Mobile' },
                { keywords: ['deutsche telekom'], name: 'Deutsche Telekom' },
                { keywords: ['orange'], name: 'Orange' },
                { keywords: ['vodafone'], name: 'Vodafone' },
                { keywords: ['telefonica'], name: 'Telefonica' },
                { keywords: ['bt', 'british telecom'], name: 'British Telecom' },
            ];

            for (const mapping of ISP_MAPPINGS) {
                if (mapping.keywords.some(k => ispLower.includes(k))) {
                    isp = mapping.name;
                    break;
                }
            }
            ispName = isp;
        }

        return {
            location: locationStr,
            isp: ispName || undefined
        };
    } catch {
        return { location: '' };
    }
}
