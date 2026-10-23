// Business details in one place (swap these per client when reusing the Feed template).
module.exports = {
  name: 'Locked & Level',
  legal: 'Locked & Level LLC',
  category: 'Tile & Remodeling',
  tagline: 'Precision. Luxury. Perfection.',
  bio: 'From intricate backsplashes to stunning floor and shower designs, our team brings your vision to life with professionalism and skill, for a flawless finish every time.',
  phone: '(603) 986-5180',
  phoneHref: '+16039865180',
  email: 'lockedandlevel@gmail.com',
  area: 'New Hampshire · Maine · Massachusetts',
  areaShort: 'NH · ME · MA',
  facebook: 'https://www.facebook.com/profile.php?id=100095180605885',
  facebookFollowers: '1.3K',
  categories: ['Showers', 'Baths', 'Floors', 'Kitchens', 'Fireplaces & walls', 'Remodels'],
  projectTypes: ['Shower / tub surround', 'Bathroom remodel', 'Floor tile', 'Kitchen backsplash', 'Kitchen remodel', 'Fireplace / feature wall', 'Other remodeling'],
  siteUrl: () => (process.env.SITE_URL || 'https://lockedandlevel.com').replace(/\/+$/, ''),
};
