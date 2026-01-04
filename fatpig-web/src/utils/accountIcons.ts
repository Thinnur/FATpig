// src/utils/accountIcons.ts
interface AccountLogo {
  logo?: string;
  fallback: string;
  color: string;
  name: string;
}

export const getAccountLogo = (nama: string, tipe: string): AccountLogo => {
  const namaLower = nama.toLowerCase();

  // Gunakan Wikipedia Commons - pasti accessible
  const bankLogos: Record<string, AccountLogo> = {
    bca: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/200px-Bank_Central_Asia.svg.png",
      fallback: "B",
      color: "bg-blue-600",
      name: "BCA",
    },
    mandiri: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/200px-Bank_Mandiri_logo_2016.svg.png",
      fallback: "M",
      color: "bg-yellow-500",
      name: "Bank Mandiri",
    },
    bni: {
      logo: "https://cdn.brandfetch.io/idVOhcVfnR/w/640/h/640/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1668518662311",
      fallback: "N",
      color: "bg-orange-500",
      name: "BNI",
    },
    bri: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/BRI_2020.svg/200px-BRI_2020.svg.png",
      fallback: "R",
      color: "bg-blue-500",
      name: "BRI",
    },
    seabank: {
      logo: "https://cdn.brandfetch.io/idZQucmeCy/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1764515058001",
      fallback: "S",
      color: "bg-blue-600",
      name: "SeaBank",
    },
    jago: {
      logo: "https://cdn.brandfetch.io/id-KjPgtta/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1675078678582",
      fallback: "J",
      color: "bg-blue-500",
      name: "Bank Jago",
    },
    jenius: {
      logo: "https://cdn.brandfetch.io/idbCXJYwU_/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1761004989607",
      fallback: "J",
      color: "bg-blue-400",
      name: "Jenius",
    },
    blu: {
      logo: "https://cdn.brandfetch.io/idMU5gRnEq/w/59/h/59/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1767416917824",
      fallback: "B",
      color: "bg-blue-500",
      name: "blu by BCA Digital",
    },
    cimb: {
      logo: "https://cdn.brandfetch.io/idYFvu8CRF/w/400/h/400/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1721275762535",
      fallback: "C",
      color: "bg-red-600",
      name: "CIMB Niaga",
    },
    permata: {
      logo: "https://cdn.brandfetch.io/idnOfuRhsS/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1730774903886",
      fallback: "P",
      color: "bg-green-600",
      name: "Bank Permata",
    },
    Superbank: {
      logo: "https://cdn.brandfetch.io/idg166pOWJ/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1761997708536",
      fallback: "S",
      color: "Color by Superbank: #AFEE00",
      name: "SuperBank",
    },
  };

  const ewalletLogos: Record<string, AccountLogo> = {
    gopay: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/200px-Gopay_logo.svg.png",
      fallback: "G",
      color: "bg-emerald-500",
      name: "GoPay",
    },
    ovo: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_purple.svg/200px-Logo_ovo_purple.svg.png",
      fallback: "O",
      color: "bg-purple-600",
      name: "OVO",
    },
    dana: {
      logo: "https://cdn.brandfetch.io/idARTrIllV/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1765268097188",
      fallback: "D",
      color: "bg-blue-500",
      name: "DANA",
    },
    shopeepay: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopee_logo.svg/200px-Shopee_logo.svg.png",
      fallback: "S",
      color: "bg-orange-500",
      name: "ShopeePay",
    },
    linkaja: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/LinkAja.svg/200px-LinkAja.svg.png",
      fallback: "L",
      color: "bg-red-600",
      name: "LinkAja",
    },
  };

  for (const [key, logoData] of Object.entries(bankLogos)) {
    if (namaLower.includes(key)) {
      return logoData;
    }
  }

  for (const [key, logoData] of Object.entries(ewalletLogos)) {
    if (namaLower.includes(key)) {
      return logoData;
    }
  }

  const fallback = nama.substring(0, 1).toUpperCase();
  if (tipe === "bank") {
    return { fallback, color: "bg-blue-600", name: nama };
  } else if (tipe === "ewallet") {
    return { fallback, color: "bg-emerald-500", name: nama };
  } else if (tipe === "cash") {
    return { fallback: "💵", color: "bg-orange-500", name: "Cash" };
  }

  return { fallback, color: "bg-gray-600", name: nama };
};
