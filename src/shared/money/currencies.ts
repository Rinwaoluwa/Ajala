/**
 * The world's currencies (ISO 4217, the ones in circulation), for the currency
 * picker and for writing money: each one's name, the mark it is written with,
 * and how many decimal places it has.
 *
 * The API takes any ISO code (spec §1.5) and answers with the amount in the
 * currency's smallest unit and its `exponent`; the exponents here are the same
 * ones, needed before the server has answered (typing a price).
 *
 * The mark is the currency's own sign where it has a well-known one ("₦", "£",
 * "GH₵"), written so two currencies are never confused ("CA$", not "$"), and
 * the code itself otherwise ("SEK"). `own` is the shorter mark people of that
 * currency use among themselves ("$" in Canada); it is used only when the
 * currency is the phone's own (`formatMoney`).
 *
 * The names are English, as the rest of the app is. The JavaScript engine on
 * the phone cannot name currencies itself (no `Intl.DisplayNames`).
 */

export type CurrencyInfo = {
  code: string;
  name: string;
  /** How it is written: "₦", "CA$", or the code. */
  symbol: string;
  /** The shorter mark used where it is the local currency, when there is one. */
  own?: string;
  /** Decimal places: 2 for most, 0 for the yen, 3 for the Kuwaiti dinar. */
  exponent: number;
};

/** code | name | symbol (blank: the code) | own (blank: none) | exponent (blank: 2) */
const TABLE = `
AED|United Arab Emirates dirham|||
AFN|Afghan afghani|||
ALL|Albanian lek|||
AMD|Armenian dram|||
ANG|Netherlands Antillean guilder|||
AOA|Angolan kwanza|Kz||
ARS|Argentine peso|AR$|$|
AUD|Australian dollar|A$|$|
AWG|Aruban florin|||
AZN|Azerbaijani manat|₼||
BAM|Bosnia and Herzegovina convertible mark|KM||
BBD|Barbadian dollar|||
BDT|Bangladeshi taka|৳||
BHD|Bahraini dinar|||3
BIF|Burundian franc|FBu||0
BMD|Bermudian dollar|||
BND|Brunei dollar|||
BOB|Bolivian boliviano|Bs||
BRL|Brazilian real|R$||
BSD|Bahamian dollar|||
BTN|Bhutanese ngultrum|Nu.||
BWP|Botswana pula|P||
BYN|Belarusian ruble|||
BZD|Belize dollar|||
CAD|Canadian dollar|CA$|$|
CDF|Congolese franc|FC||
CHF|Swiss franc|||
CLP|Chilean peso|CLP$|$|0
CNY|Chinese yuan|CN¥|¥|
COP|Colombian peso|COL$|$|
CRC|Costa Rican colón|₡||
CUP|Cuban peso|||
CVE|Cape Verdean escudo|||
CZK|Czech koruna|Kč||
DJF|Djiboutian franc|Fdj||0
DKK|Danish krone||kr|
DOP|Dominican peso|RD$||
DZD|Algerian dinar|DA||
EGP|Egyptian pound|E£||
ERN|Eritrean nakfa|Nfk||
ETB|Ethiopian birr|Br||
EUR|Euro|€||
FJD|Fijian dollar|FJ$|$|
FKP|Falkland Islands pound|||
GBP|British pound|£||
GEL|Georgian lari|₾||
GHS|Ghanaian cedi|GH₵||
GIP|Gibraltar pound|||
GMD|Gambian dalasi|D||
GNF|Guinean franc|FG||0
GTQ|Guatemalan quetzal|Q||
GYD|Guyanese dollar|||
HKD|Hong Kong dollar|HK$|$|
HNL|Honduran lempira|L||
HTG|Haitian gourde|G||
HUF|Hungarian forint|Ft||
IDR|Indonesian rupiah|Rp||
ILS|Israeli new shekel|₪||
INR|Indian rupee|₹||
IQD|Iraqi dinar|||3
IRR|Iranian rial|||
ISK|Icelandic króna||kr|0
JMD|Jamaican dollar|J$|$|
JOD|Jordanian dinar|||3
JPY|Japanese yen|¥||0
KES|Kenyan shilling|KSh||
KGS|Kyrgyzstani som|||
KHR|Cambodian riel|៛||
KMF|Comorian franc|CF||0
KPW|North Korean won|||
KRW|South Korean won|₩||0
KWD|Kuwaiti dinar|||3
KYD|Cayman Islands dollar|||
KZT|Kazakhstani tenge|₸||
LAK|Lao kip|₭||
LBP|Lebanese pound|L£||
LKR|Sri Lankan rupee|||
LRD|Liberian dollar|L$|$|
LSL|Lesotho loti|||
LYD|Libyan dinar|||3
MAD|Moroccan dirham|||
MDL|Moldovan leu|||
MGA|Malagasy ariary|Ar||
MKD|Macedonian denar|||
MMK|Myanmar kyat|K||
MNT|Mongolian tögrög|₮||
MOP|Macanese pataca|MOP$||
MRU|Mauritanian ouguiya|UM||
MUR|Mauritian rupee|||
MVR|Maldivian rufiyaa|Rf||
MWK|Malawian kwacha|MK||
MXN|Mexican peso|MX$|$|
MYR|Malaysian ringgit|RM||
MZN|Mozambican metical|MT||
NAD|Namibian dollar|N$|$|
NGN|Nigerian naira|₦||
NIO|Nicaraguan córdoba|C$||
NOK|Norwegian krone||kr|
NPR|Nepalese rupee|||
NZD|New Zealand dollar|NZ$|$|
OMR|Omani rial|||3
PAB|Panamanian balboa|B/.||
PEN|Peruvian sol|S/||
PGK|Papua New Guinean kina|K||
PHP|Philippine peso|₱||
PKR|Pakistani rupee|||
PLN|Polish złoty|zł||
PYG|Paraguayan guaraní|₲||0
QAR|Qatari riyal|||
RON|Romanian leu|||
RSD|Serbian dinar|||
RUB|Russian ruble|₽||
RWF|Rwandan franc|FRw||0
SAR|Saudi riyal|||
SBD|Solomon Islands dollar|||
SCR|Seychellois rupee|||
SDG|Sudanese pound|||
SEK|Swedish krona||kr|
SGD|Singapore dollar|S$|$|
SHP|Saint Helena pound|||
SLE|Sierra Leonean leone|Le||
SOS|Somali shilling|||
SRD|Surinamese dollar|||
SSP|South Sudanese pound|||
STN|São Tomé and Príncipe dobra|Db||
SYP|Syrian pound|||
SZL|Swazi lilangeni|E||
THB|Thai baht|฿||
TJS|Tajikistani somoni|||
TMT|Turkmenistani manat|||
TND|Tunisian dinar|DT||3
TOP|Tongan paʻanga|T$||
TRY|Turkish lira|₺||
TTD|Trinidad and Tobago dollar|TT$|$|
TWD|New Taiwan dollar|NT$|$|
TZS|Tanzanian shilling|TSh||
UAH|Ukrainian hryvnia|₴||
UGX|Ugandan shilling|USh||0
USD|US dollar|$||
UYU|Uruguayan peso|$U||
UZS|Uzbekistani som|||
VES|Venezuelan bolívar|Bs.S||
VND|Vietnamese đồng|₫||0
VUV|Vanuatu vatu|VT||0
WST|Samoan tālā|WS$||
XAF|Central African CFA franc|FCFA||0
XCD|East Caribbean dollar|EC$|$|
XCG|Caribbean guilder|Cg||
XOF|West African CFA franc|CFA||0
XPF|CFP franc|CFPF||0
YER|Yemeni rial|||
ZAR|South African rand|R||
ZMW|Zambian kwacha|ZK|K|
ZWG|Zimbabwe gold|ZiG||
`;

export const CURRENCIES: readonly CurrencyInfo[] = TABLE.trim()
  .split('\n')
  .map((line) => {
    const [code = '', name = '', symbol = '', own = '', exponent = ''] = line.split('|');
    return { code, name, symbol: symbol || code, ...(own ? { own } : null), exponent: exponent ? Number(exponent) : 2 };
  });

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

/** "ngn" or " NGN " as "NGN"; null for anything that is not three letters. */
export function currencyCode(text: string | null | undefined): string | null {
  const code = (text ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/** What is known of a currency. One not in the table is written with its code, two decimals. */
export function currencyInfo(code: string): CurrencyInfo {
  const known = BY_CODE.get(code.toUpperCase());
  if (known) return known;
  const upper = code.toUpperCase();
  return { code: upper, name: upper, symbol: upper, exponent: 2 };
}

export const isKnownCurrency = (code: string) => BY_CODE.has(code.toUpperCase());

/** Decimal places: 2 for most, 0 for the yen, 3 for the Kuwaiti dinar. */
export const currencyExponent = (code: string) => currencyInfo(code).exponent;

/** The currencies a search finds: by code, by name, or by mark ("naira", "ngn", "₦"). */
export function searchCurrencies(query: string): readonly CurrencyInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURRENCIES;
  const starts: CurrencyInfo[] = [];
  const contains: CurrencyInfo[] = [];
  for (const c of CURRENCIES) {
    const code = c.code.toLowerCase();
    const name = c.name.toLowerCase();
    if (code.startsWith(q) || c.symbol.toLowerCase() === q) starts.push(c);
    else if (name.includes(q) || code.includes(q)) contains.push(c);
  }
  return [...starts, ...contains];
}
