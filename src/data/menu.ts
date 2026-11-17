import pineappleRice from "@/assets/pineapple-fried-rice.jpg";
import barbecue from "@/assets/smoky-bbq.jpg";
import jollof from "@/assets/nigerian-jollof.jpg";

export type MenuCategory = "House favorites" | "From the grill";

export type MenuItem = {
  name: string;
  category: MenuCategory;
  description: string;
  note: string;
  image: string;
  imageAlt: string;
};

export const menuItems: MenuItem[] = [
  {
    name: "Signature Rice",
    category: "House favorites",
    description: "A house rice dish prepared with a fresh, vibrant finish.",
    note: "House favorite",
    image: pineappleRice,
    imageAlt: "Signature rice dish served in a carved pineapple",
  },
  {
    name: "Seasoned Rice",
    category: "House favorites",
    description: "A richly seasoned rice dish served with grilled plantain.",
    note: "House favorite",
    image: jollof,
    imageAlt: "Seasoned rice served with grilled plantain",
  },
  {
    name: "Grilled Chicken or Turkey",
    category: "From the grill",
    description: "Smoked, spicy barbecue, with your choice of chicken or turkey.",
    note: "From the grill",
    image: barbecue,
    imageAlt: "Smoky barbecue chicken and turkey served with pepper sauce",
  },
];