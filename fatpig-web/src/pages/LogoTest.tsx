import React, { useState } from "react";
import { getAccountLogo } from "../utils/accountIcons";

const LogoTest: React.FC = () => {
  const banks = [
    "BCA",
    "Bank Mandiri",
    "BNI",
    "BRI",
    "SeaBank",
    "Bank Jago",
    "Jenius",
    "blu by BCA Digital",
    "CIMB Niaga",
    "Bank Permata",
    "Superbank",
  ];

  const ewallets = ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"];

  const LogoCard: React.FC<{ nama: string; tipe: string }> = ({
    nama,
    tipe,
  }) => {
    const [imageError, setImageError] = useState(false);
    const logoData = getAccountLogo(nama, tipe);

    return (
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden bg-white">
          {logoData.logo && !imageError ? (
            <img
              src={logoData.logo}
              alt={logoData.name}
              className="w-full h-full object-contain p-2"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${logoData.color}`}
            >
              <span>{logoData.fallback}</span>
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-white font-medium text-sm">{nama}</p>
          <p className="text-gray-400 text-xs uppercase">{tipe}</p>
          <p
            className={`text-xs mt-1 ${
              imageError ? "text-red-400" : "text-green-400"
            }`}
          >
            {imageError ? "❌ Logo Error" : "✓ Logo OK"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Logo Test - Bank & E-Wallet
        </h1>

        {/* Banks Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Banks ({banks.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {banks.map((bank) => (
              <LogoCard key={bank} nama={bank} tipe="bank" />
            ))}
          </div>
        </div>

        {/* E-Wallets Section */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            E-Wallets ({ewallets.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ewallets.map((ewallet) => (
              <LogoCard key={ewallet} nama={ewallet} tipe="ewallet" />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-2">Summary</h3>
          <p className="text-gray-300">
            Total: {banks.length + ewallets.length} logos ({banks.length} banks
            + {ewallets.length} e-wallets)
          </p>
          <p className="text-gray-400 text-sm mt-2">
            All logos are loaded from Wikimedia Commons for reliability
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoTest;
