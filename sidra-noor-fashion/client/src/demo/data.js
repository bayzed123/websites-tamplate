/**
 * The catalogue this demo invents.
 *
 * Unlike sidra-clothing, this project ships no db.json: its data lives in the
 * NestJS server and a MySQL database, neither of which exists on static
 * hosting. So the fixtures are written here, shaped to the TypeORM entities in
 * server/src/typeorm so every field a view reads is present and named the way
 * the real API names it (createAt, imgUrl, deviceType — not created_at,
 * image_url, device).
 *
 * Product photos are the ones bundled in server/uploads, copied to
 * public/demo-uploads. `price` and `quantity` are strings because the entity
 * declares them as strings and the store calls .toString() before every write;
 * making them numbers here would look fine until an edit round-trips.
 */

// Written out rather than 86_400_000: this project builds on Vue CLI 4.5,
// whose Babel preset predates numeric separators and fails the parse.
const DAY = 86400000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();

/**
 * Every product, paired with the photo that actually shows it.
 *
 * The names are written FROM the images, not chosen first and illustrated
 * afterwards. Guessing that order round produces a catalogue where a shirt is
 * illustrated by a ring, which is what the first draft of this file did.
 *
 * `types` and `categories` use the exact slugs in src/hooks/ProductTypes.js,
 * because the storefront's category pages request products by that value —
 * a near-miss like "jewelry" leaves a page silently empty.
 *
 * Shoes, watches and handbags carry marked placeholder tiles: the template
 * bundled no photographs for them, and a page with nothing on it reads as
 * broken. A tile that says "no photo supplied" reads as what it is.
 */
const SEED = [
  // [name, photo, types, categories, price (BDT), stock]
  ['Rosewood Skater Dress', 'dr-1660340368863-189022894.jpeg', 'women_s_clothing', 'dresses', '3450', '18'],
  ['High-Rise Mom Jean', 'jn-1660340572479-333788445.jpeg', 'women_s_clothing', 'jeans', '2890', '24'],
  ['Crisp Poplin Shirt', 'images (1)-1660340953960-197648694.jpeg', 'women_s_clothing', 'shirts', '1950', '27'],
  ['Black Maxi Skirt', 'images (1)-1660341980450-109238360.jpeg', 'women_s_clothing', 'shorts_and_skirts', '2450', '16'],
  ['Tailored Formal Trouser', 'download-1660341113823-427814012.jpeg', 'men_s_clothing', 'slacks', '2650', '31'],
  ['Straight Leg Denim', 'images-1660341397128-180948668.jpeg', 'men_s_clothing', 'jeans', '3890', '19'],
  ['Polka Dot Party Frock', 'download (1)-1660341677894-296417002.jpeg', 'party_wear', 'frocks', '4200', '12'],
  ['Ivory Floral Maxi', 'download (4)-1660342121266-673225611.jpeg', 'party_wear', 'maxi_dress', '6400', '7'],
  ['Sage Tiered Gown', 'download (5)-1660342227425-494798039.jpeg', 'party_wear', 'maxi_dress', '5900', '9'],
  ['Kids Knit Top and Jean Set', 'download (2)-1660341826539-830851637.jpeg', 'kid_s_wear', 'other', '1750', '35'],
  ['Kids Bee Print Tee', 'download (3)-1660341883699-33736538.jpeg', 'kid_s_wear', 'shirts', '950', '52'],
  ['Kids Dungaree Set', 'kids-1659993779806-389673912.jpeg', 'kid_s_wear', 'other', '1450', '28'],
  ['Brushed Steel Band', 'images (2)-1660342474750-643192013.jpeg', 'jewellery', 'rings', '3200', '22'],
  ['Rose Gold Solitaire', 'download (6)-1660342370026-440262632.jpeg', 'jewellery', 'rings', '14500', '6'],
  ['Layered Chain Set', 'download (7)-1660342588341-600811041.jpeg', 'jewellery', 'chains', '4100', '15'],
  ['Infinity Bracelet', 'images (3)-1660342668025-995850773.jpeg', 'jewellery', 'bracelets', '5600', '11'],
  ['Everyday Leather Loafer', 'placeholder-shoe-1.svg', 'shoes', 'women_shoes', '4300', '14'],
  ['Canvas Court Trainer', 'placeholder-shoe-2.svg', 'shoes', 'casual_shoes', '3600', '20'],
  ['Slim Leather Strap Watch', 'placeholder-watch-1.svg', 'watches', 'leather_strap', '7800', '8'],
  ['Steel Link Watch', 'placeholder-watch-2.svg', 'watches', 'steel_strap', '9600', '5'],
  ['Structured Leather Tote', 'placeholder-bag-1.svg', 'handbags', 'leather', '5400', '13'],
  ['Cotton Crossbody Bag', 'placeholder-bag-2.svg', 'handbags', 'cotton_bags', '2200', '26'],
];

const BLURB = {
  women_s_clothing: 'Cut from a mid-weight cotton blend with a clean inside seam.',
  men_s_clothing: 'Mid-weight and pre-shrunk, with a straight cut through the leg.',
  kid_s_wear: 'Soft-washed cotton, sized with room to grow and safe to tumble dry.',
  party_wear: 'Lined bodice, concealed side zip, and a hem finished by hand.',
  jewellery: 'Hypoallergenic finish, presented in a recycled board gift box.',
  shoes: 'Padded footbed and a stitched sole that can be resoled.',
  watches: 'Quartz movement, 5ATM water resistance, two-year movement warranty.',
  handbags: 'Cotton-lined with a zip pocket and an adjustable strap.',
};

export const PRODUCTS = SEED.map(([name, photo, types, categories, price, quantity], i) => ({
  id: i + 1,
  name,
  price,
  quantity,
  types,
  categories,
  description:
    `${name}. ${BLURB[types]} Model is 178cm and wears a size M. ` +
    'Every word of this description is placeholder copy written for the demo.',
  imgUrl: photo,
  createAt: ago(150 - i * 6),
  updateAt: ago(30 - (i % 14)),
}));

const BUYERS = [
  ['Rahim Chowdhury', 'Dhaka', 'Dhanmondi', 'Dhaka', 'Road 8, House 42', '01711000101', '1209'],
  ['Farhana Akter', 'Chattogram', 'Khulshi', 'Chattogram', 'Lane 3, Block C', '01711000102', '4000'],
  ['Sabbir Hossain', 'Sylhet', 'Zindabazar', 'Sylhet', 'Shop Road 11', '01711000103', '3100'],
  ['Nusrat Jahan', 'Dhaka', 'Uttara', 'Dhaka', 'Sector 7, Road 14', '01711000104', '1230'],
  ['Tanvir Islam', 'Rajshahi', 'Shaheb Bazar', 'Rajshahi', 'House 9', '01711000105', '6000'],
  ['Mitu Rahman', 'Khulna', 'Sonadanga', 'Khulna', 'Road 2', '01711000106', '9100'],
  ['Arif Mahmud', 'Dhaka', 'Mirpur', 'Dhaka', 'Block B, Road 5', '01711000107', '1216'],
  ['Sumaiya Kabir', 'Barishal', 'Band Road', 'Barishal', 'House 17', '01711000108', '8200'],
  ['Jahid Hasan', 'Dhaka', 'Bashundhara', 'Dhaka', 'Block G, Road 3', '01711000109', '1229'],
  ['Rumana Haque', 'Cumilla', 'Kandirpar', 'Cumilla', 'House 4', '01711000110', '3500'],
  ['Shakil Ahmed', 'Dhaka', 'Gulshan', 'Dhaka', 'Road 71, House 6', '01711000111', '1212'],
  ['Nadia Sultana', 'Gazipur', 'Tongi', 'Gazipur', 'Road 1', '01711000112', '1710'],
];

export const ORDERS = BUYERS.map(([fullName, city, place, state, street, telephone, zip], i) => ({
  id: i + 1,
  fullName,
  city,
  place,
  state,
  street,
  telephone,
  zip,
  createAt: ago(45 - i * 3),
  // Older orders are settled; the newest few are still waiting, so the
  // Confirm button on the Orders screen has something real to act on.
  status: i >= BUYERS.length - 4 ? false : true,
  products: [
    PRODUCTS[(i * 3) % PRODUCTS.length],
    PRODUCTS[(i * 5 + 2) % PRODUCTS.length],
  ],
}));

export const USERS = [
  { id: 1, username: 'Sidra Noor', email: 'owner@sidranoor.demo', role: 'SUPER_ADMIN' },
  { id: 2, username: 'Imran Kabir', email: 'imran@sidranoor.demo', role: 'ADMIN' },
  { id: 3, username: 'Tasnim Rahman', email: 'tasnim@sidranoor.demo', role: 'ADMIN' },
  { id: 4, username: 'Rafiq Uddin', email: 'rafiq@sidranoor.demo', role: 'USER' },
  { id: 5, username: 'Lamia Haque', email: 'lamia@sidranoor.demo', role: 'USER' },
  { id: 6, username: 'Shuvo Das', email: 'shuvo@sidranoor.demo', role: 'USER' },
  { id: 7, username: 'Priya Saha', email: 'priya@sidranoor.demo', role: 'USER' },
  { id: 8, username: 'Naeem Hasan', email: 'naeem@sidranoor.demo', role: 'USER' },
].map((u, i) => ({
  ...u,
  // A local SVG, not a remote avatar service: a demo should not make the
  // viewer's browser talk to a third party to render a face.
  imgUrl: `demo-uploads/avatar-${(i % 4) + 1}.svg`,
  createAt: ago(300 - i * 21),
  updateAt: ago(20 - (i % 9)),
}));

const SUBJECTS = [
  ['Do you ship outside Dhaka?', 'Desktop'],
  ['Wrong size delivered — can I exchange?', 'Mobile'],
  ['Is the linen shirt dress restocking?', 'Mobile'],
  ['Bulk order for a boutique', 'Desktop'],
  ['Payment failed but money deducted', 'Mobile'],
  ['Request for a size chart', 'Tablet'],
  ['Do you offer gift wrapping?', 'Desktop'],
];

export const MESSAGES = SUBJECTS.map(([subject, deviceType], i) => ({
  messageId: i + 1,
  name: BUYERS[i][0],
  email: `${BUYERS[i][0].split(' ')[0].toLowerCase()}@example.com`,
  subject,
  message:
    `${subject} I placed an order last week and wanted to check before ordering again. ` +
    'This message is invented for the demo — no one actually wrote it.',
  createAt: ago(20 - i * 2),
  deviceType,
}));
