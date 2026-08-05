const fs = require('fs');
const json = JSON.parse(fs.readFileSync('public/metarh_cache_18k.json'));
const data = json.data || json;

const BRAZIL_UFS = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

function parseUF(str) {
  if (!str) return 'SP';
  const upper = str.trim().toUpperCase();
  if (BRAZIL_UFS[upper]) return upper;
  
  const m = upper.match(/[\s\-\/\,](AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/);
  if (m) return m[1];

  for (const [code, name] of Object.entries(BRAZIL_UFS)) {
    if (upper.includes(name.toUpperCase())) return code;
  }
  
  return 'SP';
}

function parseLocation(raw) {
  let regStr = (raw['e '] || raw['e'] || raw['Região'] || raw['Cidade - UF'] || '').toString().trim();
  if (!regStr || regStr === '-' || /^\d+$/.test(regStr)) {
    regStr = '';
  }
  
  let uf = 'SP';
  let cidade = '';

  if (regStr) {
    uf = parseUF(regStr);
    let cleanCity = regStr.replace(/[\s\-\/\,](AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i, '').trim();
    cleanCity = cleanCity.replace(/[\-\/]$/, '').trim();
    cidade = cleanCity || 'São Paulo';
  } else {
    cidade = 'São Paulo';
    uf = 'SP';
  }

  const regiao = `${cidade} - ${uf}`;
  return { cidade, uf, regiao };
}

const ufs = {};
const regioes = {};

data.forEach(d => {
  const loc = parseLocation(d);
  ufs[loc.uf] = (ufs[loc.uf] || 0) + 1;
  regioes[loc.regiao] = (regioes[loc.regiao] || 0) + 1;
});

console.log('UFs breakdown:', ufs);
console.log('Top 15 Regiões:', Object.entries(regioes).sort((a,b)=>b[1]-a[1]).slice(0, 15));
