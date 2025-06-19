import CountryCodes from "country-code-lookup";

export function getCountryCode(countryName) {
  CountryCodes.byCountry();
  const country = CountryCodes.byCountry(countryName);
  return country ? country.iso2 : null;
}
