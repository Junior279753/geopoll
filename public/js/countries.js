// Base de données des pays avec codes téléphoniques et codes postaux
const COUNTRIES_DATA = {
    "FR": {
        name: "France",
        phoneCode: "+33",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "75001",
        phoneFormat: "XX XX XX XX XX",
        phoneExample: "01 23 45 67 89"
    },
    "SN": {
        name: "Sénégal",
        phoneCode: "+221",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "12500",
        phoneFormat: "XX XXX XX XX",
        phoneExample: "77 123 45 67"
    },
    "ML": {
        name: "Mali",
        phoneCode: "+223",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "65 12 34 56"
    },
    "BF": {
        name: "Burkina Faso",
        phoneCode: "+226",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "70 12 34 56"
    },
    "CI": {
        name: "Côte d'Ivoire",
        phoneCode: "+225",
        postalCodeFormat: "XX XXX XXX XXX",
        postalCodeExample: "01 BP 1234 ABJ",
        phoneFormat: "XX XX XX XX XX",
        phoneExample: "07 12 34 56 78"
    },
    "GN": {
        name: "Guinée",
        phoneCode: "+224",
        postalCodeFormat: "XXX",
        postalCodeExample: "001",
        phoneFormat: "XXX XX XX XX",
        phoneExample: "622 12 34 56"
    },
    "NE": {
        name: "Niger",
        phoneCode: "+227",
        postalCodeFormat: "XXXX",
        postalCodeExample: "8000",
        phoneFormat: "XX XX XX XX",
        phoneExample: "96 12 34 56"
    },
    "TD": {
        name: "Tchad",
        phoneCode: "+235",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "66 12 34 56"
    },
    "MR": {
        name: "Mauritanie",
        phoneCode: "+222",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "22 12 34 56"
    },
    "TG": {
        name: "Togo",
        phoneCode: "+228",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "90 12 34 56"
    },
    "BJ": {
        name: "Bénin",
        phoneCode: "+229",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "97 12 34 56"
    },
    "GH": {
        name: "Ghana",
        phoneCode: "+233",
        postalCodeFormat: "XXXXXXXX",
        postalCodeExample: "GA123456",
        phoneFormat: "XXX XXX XXXX",
        phoneExample: "024 123 4567"
    },
    "NG": {
        name: "Nigeria",
        phoneCode: "+234",
        postalCodeFormat: "XXXXXX",
        postalCodeExample: "100001",
        phoneFormat: "XXX XXX XXXX",
        phoneExample: "080 1234 5678"
    },
    "CM": {
        name: "Cameroun",
        phoneCode: "+237",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "X XX XX XX XX",
        phoneExample: "6 77 12 34 56"
    },
    "MA": {
        name: "Maroc",
        phoneCode: "+212",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "10000",
        phoneFormat: "XXX-XXXXXX",
        phoneExample: "061-123456"
    },
    "DZ": {
        name: "Algérie",
        phoneCode: "+213",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "16000",
        phoneFormat: "XXX XX XX XX",
        phoneExample: "055 12 34 56"
    },
    "TN": {
        name: "Tunisie",
        phoneCode: "+216",
        postalCodeFormat: "XXXX",
        postalCodeExample: "1000",
        phoneFormat: "XX XXX XXX",
        phoneExample: "20 123 456"
    },
    "EG": {
        name: "Égypte",
        phoneCode: "+20",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "11511",
        phoneFormat: "XXX XXX XXXX",
        phoneExample: "010 1234 5678"
    },
    "KE": {
        name: "Kenya",
        phoneCode: "+254",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "00100",
        phoneFormat: "XXX XXXXXX",
        phoneExample: "722 123456"
    },
    "ZA": {
        name: "Afrique du Sud",
        phoneCode: "+27",
        postalCodeFormat: "XXXX",
        postalCodeExample: "0001",
        phoneFormat: "XX XXX XXXX",
        phoneExample: "82 123 4567"
    },
    "CD": {
        name: "République Démocratique du Congo",
        phoneCode: "+243",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXX XXX",
        phoneExample: "970 123 456"
    },
    "CG": {
        name: "République du Congo",
        phoneCode: "+242",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XXX XX XX",
        phoneExample: "06 123 45 67"
    },
    "GA": {
        name: "Gabon",
        phoneCode: "+241",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "07 12 34 56"
    },
    "CF": {
        name: "République Centrafricaine",
        phoneCode: "+236",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "70 12 34 56"
    },
    "GQ": {
        name: "Guinée Équatoriale",
        phoneCode: "+240",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXX XXX",
        phoneExample: "222 123 456"
    },
    "ST": {
        name: "São Tomé-et-Príncipe",
        phoneCode: "+239",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXXX",
        phoneExample: "991 2345"
    },
    "DJ": {
        name: "Djibouti",
        phoneCode: "+253",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "77 12 34 56"
    },
    "SO": {
        name: "Somalie",
        phoneCode: "+252",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XXX XXXX",
        phoneExample: "61 123 4567"
    },
    "ET": {
        name: "Éthiopie",
        phoneCode: "+251",
        postalCodeFormat: "XXXX",
        postalCodeExample: "1000",
        phoneFormat: "XXX XXX XXXX",
        phoneExample: "911 123 456"
    },
    "ER": {
        name: "Érythrée",
        phoneCode: "+291",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "X XXX XXX",
        phoneExample: "7 123 456"
    },
    "SD": {
        name: "Soudan",
        phoneCode: "+249",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "11111",
        phoneFormat: "XXX XXX XXXX",
        phoneExample: "912 123 456"
    },
    "SS": {
        name: "Soudan du Sud",
        phoneCode: "+211",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXX XXX",
        phoneExample: "977 123 456"
    },
    "UG": {
        name: "Ouganda",
        phoneCode: "+256",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXXXXX",
        phoneExample: "772 123456"
    },
    "RW": {
        name: "Rwanda",
        phoneCode: "+250",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXX XXX",
        phoneExample: "788 123 456"
    },
    "BI": {
        name: "Burundi",
        phoneCode: "+257",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XX XX XX",
        phoneExample: "79 12 34 56"
    },
    "TZ": {
        name: "Tanzanie",
        phoneCode: "+255",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XXX XXX",
        phoneExample: "754 123 456"
    },
    "MW": {
        name: "Malawi",
        phoneCode: "+265",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "X XXX XXXX",
        phoneExample: "1 234 5678"
    },
    "ZM": {
        name: "Zambie",
        phoneCode: "+260",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "10101",
        phoneFormat: "XXX XXXXXX",
        phoneExample: "977 123456"
    },
    "ZW": {
        name: "Zimbabwe",
        phoneCode: "+263",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XX XXX XXXX",
        phoneExample: "77 123 4567"
    },
    "MZ": {
        name: "Mozambique",
        phoneCode: "+258",
        postalCodeFormat: "XXXX",
        postalCodeExample: "1100",
        phoneFormat: "XX XXX XXXX",
        phoneExample: "82 123 4567"
    },
    "MG": {
        name: "Madagascar",
        phoneCode: "+261",
        postalCodeFormat: "XXX",
        postalCodeExample: "101",
        phoneFormat: "XX XX XXX XX",
        phoneExample: "32 12 345 67"
    },
    "MU": {
        name: "Maurice",
        phoneCode: "+230",
        postalCodeFormat: "XXXXX",
        postalCodeExample: "11328",
        phoneFormat: "XXXX XXXX",
        phoneExample: "5251 2345"
    },
    "SC": {
        name: "Seychelles",
        phoneCode: "+248",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "X XX XX XX",
        phoneExample: "2 51 23 45"
    },
    "KM": {
        name: "Comores",
        phoneCode: "+269",
        postalCodeFormat: "",
        postalCodeExample: "",
        phoneFormat: "XXX XX XX",
        phoneExample: "321 23 45"
    },
    "CV": {
        name: "Cap-Vert",
        phoneCode: "+238",
        postalCodeFormat: "XXXX",
        postalCodeExample: "7600",
        phoneFormat: "XXX XX XX",
        phoneExample: "991 12 34"
    }
};

// Fonction pour obtenir la liste des pays triée
function getCountriesList() {
    return Object.entries(COUNTRIES_DATA)
        .map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Fonction pour obtenir les données d'un pays
function getCountryData(countryCode) {
    return COUNTRIES_DATA[countryCode] || null;
}

// Fonction pour formater un numéro de téléphone
function formatPhoneNumber(phone, countryCode) {
    const countryData = getCountryData(countryCode);
    if (!countryData || !countryData.phoneFormat) {
        // Retourne les chiffres si aucun format n'est trouvé
        return phone.replace(/\D/g, '');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const formatParts = countryData.phoneFormat.split(' ');
    const phoneParts = [];
    let phoneIndex = 0;

    for (const part of formatParts) {
        if (phoneIndex >= cleanPhone.length) {
            break;
        }
        const partLength = part.length;
        phoneParts.push(cleanPhone.substr(phoneIndex, partLength));
        phoneIndex += partLength;
    }

    return phoneParts.join(' ');
}

// Fonction pour valider un code postal
function validatePostalCode(postalCode, countryCode) {
    const countryData = getCountryData(countryCode);
    if (!countryData || !countryData.postalCodeFormat) return true; // Pas de validation si pas de format
    
    const format = countryData.postalCodeFormat;
    const regex = format.replace(/X/g, '\\d').replace(/\s/g, '\\s?');
    return new RegExp(`^${regex}$`).test(postalCode);
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COUNTRIES_DATA,
        getCountriesList,
        getCountryData,
        formatPhoneNumber,
        validatePostalCode
    };
}
