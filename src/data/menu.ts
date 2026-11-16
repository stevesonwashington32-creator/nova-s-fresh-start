import pineappleRice from "@/assets/pineapple-fried-rice.jpg";
import barbecue from "@/assets/smoky-bbq.jpg";
import jollof from "@/assets/jollof-rice.jpg";

export type MenuCategory = "Rice & local favorites" | "From the grill";

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
    name: "Pineapple Fried Rice",
    category: "Rice & local favorites",
    description: "A house rice dish prepared with a fresh, vibrant finish.",
    note: "House favorite",
    image: pineappleRice,
    imageAlt: "Pineapple fried rice served in a carved pineapple",
  },
  {
    name: "Nigerian Jollof Rice",
    category: "Rice & local favorites",
    description: "A familiar Nigerian classic served with grilled plantain.",
    note: "House favorite",
    image: jollof,
    imageAlt: "Nigerian jollof rice with grilled plantain",
  },
  {
    name: "Smoky BBQ Chicken or Turkey",
    category: "From the grill",
    description: "Smoked, spicy barbecue, with your choice of chicken or turkey.",
    note: "From the grill",
    image: barbecue,
    imageAlt: "Smoky barbecue chicken and turkey served with pepper sauce",
  },
];