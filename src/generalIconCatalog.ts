import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerUpLeft, Compass, Map, MapPin, Route, Home, DoorOpen, Signpost, Flag,
  Info, HelpCircle, X, Settings, Maximize, Minimize, Rotate3d, Volume2, VolumeX, Headphones, Languages, Accessibility,
  Camera, Images, Video, Play, Pause, Film, Music2, Monitor, Eye, ScanLine,
  Globe, Phone, Mail, MessageCircle, CalendarDays, Ticket, ShoppingBag, Gift, Heart, Share2, Clock, Star, Link2, QrCode,
  BedDouble, Bath, ShowerHead, Caravan, Tent, Trees, Mountain, Waves, Umbrella, Sun, Bike, Dog, Flame,
  Utensils, ChefHat, Coffee, Wine, Martini, Pizza, IceCream, CakeSlice, Sandwich, Leaf,
  Sparkles, Droplet, Flower2, HandHeart, HeartPulse, Dumbbell, PersonStanding, Shirt, Wind, Thermometer,
  Car, ParkingCircle, Bus, TrainFront, Plane, Wifi, Plug, KeyRound, Lock, ShieldCheck, Package, CreditCard,
  Briefcase, Users, Building2, House, Ruler, Layers, Armchair, Fence, Tv, GraduationCap, Landmark, Theater,
  type LucideIcon
} from 'lucide-react';

type CatalogGroup={name:string;icons:readonly (readonly [string,LucideIcon])[]};

export const GENERAL_ICON_GROUPS:readonly CatalogGroup[]=[
  {name:'Navigation 360°',icons:[['Avancer',ArrowUp],['Reculer',ArrowDown],['Gauche',ArrowLeft],['Droite',ArrowRight],['Retour',CornerUpLeft],['Orientation',Compass],['Plan',Map],['Localisation',MapPin],['Itinéraire',Route],['Accueil',Home],['Entrée',DoorOpen],['Signalétique',Signpost],['Destination',Flag]]},
  {name:'Commandes et accessibilité',icons:[['Information',Info],['Aide',HelpCircle],['Fermer',X],['Paramètres',Settings],['Plein écran',Maximize],['Réduire',Minimize],['Panorama',Rotate3d],['Son activé',Volume2],['Son coupé',VolumeX],['Casque',Headphones],['Langues',Languages],['Accessibilité',Accessibility]]},
  {name:'Photos, vidéo et son',icons:[['Photo',Camera],['Galerie',Images],['Vidéo',Video],['Lecture',Play],['Pause',Pause],['Cinéma',Film],['Musique',Music2],['Écran',Monitor],['Aperçu',Eye],['Scanner',ScanLine]]},
  {name:'Contact et réservation',icons:[['Site web',Globe],['Téléphone',Phone],['Email',Mail],['Messagerie',MessageCircle],['Réserver',CalendarDays],['Billetterie',Ticket],['Boutique',ShoppingBag],['Offrir',Gift],['Favori',Heart],['Partager',Share2],['Horaires',Clock],['Avis',Star],['Lien',Link2],['QR code',QrCode]]},
  {name:'Tourisme et camping',icons:[['Chambre',BedDouble],['Baignoire',Bath],['Douche',ShowerHead],['Caravane',Caravan],['Camping',Tent],['Forêt',Trees],['Montagne',Mountain],['Piscine',Waves],['Plage',Umbrella],['Soleil',Sun],['Vélo',Bike],['Animaux admis',Dog],['Barbecue',Flame]]},
  {name:'Restauration',icons:[['Restaurant',Utensils],['Cuisine',ChefHat],['Café',Coffee],['Vin',Wine],['Cocktail',Martini],['Pizza',Pizza],['Glaces',IceCream],['Dessert',CakeSlice],['Snack',Sandwich],['Végétarien',Leaf]]},
  {name:'Spa et bien-être',icons:[['Soins',Sparkles],['Huiles',Droplet],['Spa',Flower2],['Massage',HandHeart],['Santé',HeartPulse],['Fitness',Dumbbell],['Activité',PersonStanding],['Vestiaire',Shirt],['Hammam',Wind],['Sauna',Thermometer]]},
  {name:'Services et transports',icons:[['Voiture',Car],['Parking',ParkingCircle],['Bus',Bus],['Train',TrainFront],['Aéroport',Plane],['Wi-Fi',Wifi],['Recharge',Plug],['Clés',KeyRound],['Accès sécurisé',Lock],['Sécurité',ShieldCheck],['Consigne',Package],['Paiement',CreditCard]]},
  {name:'Immobilier et lieux publics',icons:[['Bureau',Briefcase],['Équipe',Users],['Immeuble',Building2],['Maison',House],['Dimensions',Ruler],['Étages',Layers],['Salon',Armchair],['Extérieur',Fence],['Télévision',Tv],['Éducation',GraduationCap],['Patrimoine',Landmark],['Spectacle',Theater]]},
];

export const GENERAL_ICONS=GENERAL_ICON_GROUPS.flatMap(group=>group.icons.map(([label,Glyph])=>({label,Glyph,category:group.name})));
