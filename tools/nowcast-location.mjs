const STATES = Object.freeze({
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',PR:'Puerto Rico',VI:'U.S. Virgin Islands',GU:'Guam',AS:'American Samoa',MP:'Northern Mariana Islands'
});
export function fullStateName(state) { return STATES[String(state || '').trim().toUpperCase()] || String(state || '').trim(); }
export function formatPlaceName(name) {
  return String(name || '').split(',').map(part=>fullStateName(part)).filter(Boolean).join(', ').replace(/, US$/, '');
}
export async function searchPlaces(text, fetchJSON) {
  const coordinate = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinate) {
    const lat=Number(coordinate[1]),lon=Number(coordinate[2]);
    if (Math.abs(lat)>85 || Math.abs(lon)>180) throw Error('Enter valid map coordinates.');
    return [{lat,lon,name:lat.toFixed(3)+', '+lon.toFixed(3),source:'manual coordinates'}];
  }
  const [city,...regions]=text.split(',').map(part=>part.trim());
  const query=new URLSearchParams({name:city,count:'20',language:'en',format:'json'});
  const data=await fetchJSON('https://geocoding-api.open-meteo.com/v1/search?'+query);
  let results=(data?.results || []).filter(r=>Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  const region=regions[0] && fullStateName(regions[0]).toLowerCase();
  if (region) results=results.filter(r=>[r.admin1,r.country,r.country_code].some(value=>fullStateName(value).toLowerCase()===region));
  return results.slice(0,10).map(r=>({lat:r.latitude,lon:r.longitude,name:[r.name,fullStateName(r.admin1),r.country_code==='US' ? '' : r.country || r.country_code].filter(Boolean).join(', '),source:'city search'}));
}
