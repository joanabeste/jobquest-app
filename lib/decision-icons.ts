import {
  // Work & Office
  Briefcase, Clipboard, ClipboardCheck, ClipboardList, FileText, FilePlus, FileCheck, FileSearch,
  FolderOpen, Folder, Printer, Monitor, Laptop, Smartphone, Tablet,
  Mail, MailOpen, Phone, PhoneCall, MessageCircle, MessageSquare, MessagesSquare, Send, Inbox, Archive,
  // People & Social
  Users, User, UserCheck, UserPlus, UserMinus, UserCog, UserX, Contact,
  Heart, Handshake, Baby, HeartHandshake, PersonStanding, Accessibility,
  // Actions & Navigation
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  ThumbsUp, ThumbsDown, Check, CheckCircle, CheckCheck, XCircle, X as XIcon,
  // Time & Planning
  Clock, Clock1, Clock12, Timer, Hourglass, Calendar, CalendarDays, CalendarCheck, CalendarClock,
  AlarmClock, Watch,
  // Nature & Environment
  Sun, Sunrise, Sunset, Moon, Cloud, CloudRain, CloudSnow, Snowflake,
  Leaf, Flower, Flower2, TreePine, TreeDeciduous, Sprout, Mountain, Waves,
  Globe, Earth,
  // Tools & Tech
  Settings, Settings2, Wrench, Hammer, Scissors, Drill, HardHat,
  PenTool, Pencil, Pen, Highlighter, Eraser, Ruler, Paintbrush, Palette,
  Search, SearchCheck, Microscope, FlaskConical, TestTube, Atom,
  Cpu, Database, Server, HardDrive, Code, Code2, Terminal, Bug, GitBranch,
  // Health & Safety
  Shield, ShieldCheck, ShieldAlert, HeartPulse, Activity, Stethoscope,
  Pill, Syringe, Bandage, Cross, Brain, Bone, Eye as EyeIcon, Ear,
  // Finance & Business
  TrendingUp, TrendingDown, BarChart, BarChart2, BarChart3, LineChart, PieChart,
  DollarSign, Euro, PoundSterling, Coins, Banknote, CreditCard, Wallet, Receipt, Calculator,
  // Energy & Power
  Zap, ZapOff, Flame, Battery, BatteryCharging, BatteryLow, BatteryFull, Power, PowerOff,
  Lightbulb, LightbulbOff, Fuel, Plug,
  // Transport
  Car, CarFront, Truck, TruckIcon, Bus, Bike, Plane, PlaneTakeoff, PlaneLanding,
  Train, TrainFront, Ship, Sailboat, Anchor, Fuel as GasIcon,
  // Food & Lifestyle
  Coffee, CupSoda, Pizza, Apple, Cherry, Carrot, Croissant, Sandwich, Salad,
  Utensils, UtensilsCrossed, ChefHat, Soup, IceCream, Cookie, Beer, Wine,
  ShoppingCart, ShoppingBag, ShoppingBasket, Gift, PartyPopper,
  // Emotions & Fun
  Smile, Frown, Laugh, Meh, Angry, Annoyed, SmilePlus,
  Star, StarHalf, Sparkles, Trophy, Award, Medal, Crown, Gem,
  // Alerts & Info
  AlertTriangle, AlertCircle, AlertOctagon, Info, HelpCircle, CircleHelp,
  Flag, FlagTriangleRight, Bookmark, BookmarkPlus, Bell, BellOff, BellRing,
  Megaphone, Volume2, VolumeX,
  // Media & Content
  Image, ImagePlus, Images, Video, VideoOff, Film, Music, Music2,
  Headphones, HeadphoneOff, Mic, MicOff, Camera, CameraOff, Play, PlayCircle, Pause, PauseCircle,
  SkipForward, SkipBack, Repeat, Shuffle,
  // Navigation & Location
  MapPin, MapPinned, Map, Compass, Navigation, Navigation2, Home, House,
  Building, Building2, Hotel, Store, School, Hospital, Factory, Warehouse,
  Castle, Church, Landmark, Tent,
  // Books & Education
  Book, BookOpen, BookMarked, Library, GraduationCap, Backpack,
  // Sports & Activities
  Dumbbell, Bike as BikeIcon, Footprints, Trophy as TrophyIcon, Medal as MedalIcon,
  // Weather
  CloudLightning, CloudDrizzle, CloudFog, Wind, Umbrella, Rainbow,
  // Misc
  Rocket, Target, Eye, Lock, Unlock, Key, KeyRound, Package, PackageCheck, PackageOpen,
  Box, Boxes, Layers, Grid, Grid3X3, List, LayoutGrid,
  Puzzle, Dice1, Dice5, Hash, AtSign, Percent, Sigma, Infinity,
  Cog, Filter, Funnel, Recycle, Trash, Trash2, Tag, Tags, Ticket,
  Pin, PinOff, PaperclipIcon, Paperclip, Link, Link2, Share, Share2, ExternalLink,
  Download, Upload, RefreshCw, RotateCw, RotateCcw, Maximize, Minimize, Expand,
  Plus, Minus, Equal, Divide, X as Multiply,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const DECISION_ICONS: Record<string, LucideIcon> = {
  // Work & Office
  Briefcase, Clipboard, ClipboardCheck, ClipboardList, FileText, FilePlus, FileCheck, FileSearch,
  FolderOpen, Folder, Printer, Monitor, Laptop, Smartphone, Tablet,
  Mail, MailOpen, Phone, PhoneCall, MessageCircle, MessageSquare, MessagesSquare, Send, Inbox, Archive,
  // People & Social
  Users, User, UserCheck, UserPlus, UserMinus, UserCog, UserX, Contact,
  Heart, Handshake, Baby, HeartHandshake, PersonStanding, Accessibility,
  // Actions
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  ThumbsUp, ThumbsDown, Check, CheckCircle, CheckCheck, XCircle, X: XIcon,
  // Time & Planning
  Clock, Clock1, Clock12, Timer, Hourglass, Calendar, CalendarDays, CalendarCheck, CalendarClock,
  AlarmClock, Watch,
  // Nature
  Sun, Sunrise, Sunset, Moon, Cloud, CloudRain, CloudSnow, Snowflake,
  Leaf, Flower, Flower2, TreePine, TreeDeciduous, Sprout, Mountain, Waves,
  Globe, Earth,
  // Tools & Tech
  Settings, Settings2, Wrench, Hammer, Scissors, Drill, HardHat,
  PenTool, Pencil, Pen, Highlighter, Eraser, Ruler, Paintbrush, Palette,
  Search, SearchCheck, Microscope, FlaskConical, TestTube, Atom,
  Cpu, Database, Server, HardDrive, Code, Code2, Terminal, Bug, GitBranch,
  // Health & Safety
  Shield, ShieldCheck, ShieldAlert, HeartPulse, Activity, Stethoscope,
  Pill, Syringe, Bandage, Cross, Brain, Bone, EyeIcon, Ear,
  // Finance
  TrendingUp, TrendingDown, BarChart, BarChart2, BarChart3, LineChart, PieChart,
  DollarSign, Euro, PoundSterling, Coins, Banknote, CreditCard, Wallet, Receipt, Calculator,
  // Energy
  Zap, ZapOff, Flame, Battery, BatteryCharging, BatteryLow, BatteryFull, Power, PowerOff,
  Lightbulb, LightbulbOff, Fuel, Plug,
  // Transport
  Car, CarFront, Truck, TruckIcon, Bus, Bike, Plane, PlaneTakeoff, PlaneLanding,
  Train, TrainFront, Ship, Sailboat, Anchor, GasIcon,
  // Food & Lifestyle
  Coffee, CupSoda, Pizza, Apple, Cherry, Carrot, Croissant, Sandwich, Salad,
  Utensils, UtensilsCrossed, ChefHat, Soup, IceCream, Cookie, Beer, Wine,
  ShoppingCart, ShoppingBag, ShoppingBasket, Gift, PartyPopper,
  // Emotions & Fun
  Smile, Frown, Laugh, Meh, Angry, Annoyed, SmilePlus,
  Star, StarHalf, Sparkles, Trophy, Award, Medal, Crown, Gem,
  // Alerts & Info
  AlertTriangle, AlertCircle, AlertOctagon, Info, HelpCircle, CircleHelp,
  Flag, FlagTriangleRight, Bookmark, BookmarkPlus, Bell, BellOff, BellRing,
  Megaphone, Volume2, VolumeX,
  // Media
  Image, ImagePlus, Images, Video, VideoOff, Film, Music, Music2,
  Headphones, HeadphoneOff, Mic, MicOff, Camera, CameraOff, Play, PlayCircle, Pause, PauseCircle,
  SkipForward, SkipBack, Repeat, Shuffle,
  // Location
  MapPin, MapPinned, Map, Compass, Navigation, Navigation2, Home, House,
  Building, Building2, Hotel, Store, School, Hospital, Factory, Warehouse,
  Castle, Church, Landmark, Tent,
  // Books & Education
  Book, BookOpen, BookMarked, Library, GraduationCap, Backpack,
  // Sports & Activities
  Dumbbell, BikeIcon, Footprints, TrophyIcon, MedalIcon,
  // Weather
  CloudLightning, CloudDrizzle, CloudFog, Wind, Umbrella, Rainbow,
  // Misc
  Rocket, Target, Eye, Lock, Unlock, Key, KeyRound, Package, PackageCheck, PackageOpen,
  Box, Boxes, Layers, Grid, Grid3X3, List, LayoutGrid,
  Puzzle, Dice1, Dice5, Hash, AtSign, Percent, Sigma, Infinity,
  Cog, Filter, Funnel, Recycle, Trash, Trash2, Tag, Tags, Ticket,
  Pin, PinOff, Paperclip, PaperclipIcon, Link, Link2, Share, Share2, ExternalLink,
  Download, Upload, RefreshCw, RotateCw, RotateCcw, Maximize, Minimize, Expand,
  Plus, Minus, Equal, Divide, Multiply,
};

// Common emojis grouped by category for the picker
export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Gesichter', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😍','🥰','😘','😎','🤩','🥳','😏','😒','😞','😟','😢','😭','😡','🤯','😱','🤔','🤗','🙏','💪','👍','👎','✌️','🤝'] },
  { label: 'Herzen & Symbole', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','💫','🔥','💥','❓','❗','✅','❌','⚡','🎯','🏆','🥇','🎖️','🎗️'] },
  { label: 'Tiere & Natur', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐦','🦋','🌸','🌺','🌻','🌹','🌿','🍀','🌲','🌳','🌍','🌊','🌈','☀️','⛅','🌙','⭐'] },
  { label: 'Essen & Trinken', emojis: ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍕','🍔','🌮','🍜','🍱','🍣','🍩','🎂','☕','🍵','🧃','🥤','🍺','🍷','🥂','🍾'] },
  { label: 'Reisen & Orte', emojis: ['✈️','🚀','🚂','🚗','🚕','🛵','🏠','🏢','🏥','🏫','🏪','🗼','🗽','⛪','🌆','🌇','🎡','🎢','🎠','⛺','🏖️','🏔️','🗺️'] },
  { label: 'Gegenstände', emojis: ['💼','📁','📂','📋','📌','📍','🔑','🔒','🔓','💡','🔦','🔧','🔨','✂️','📱','💻','🖥️','⌨️','🖨️','📷','🎥','📺','📻','🎵','🎶','🎸','🎹','🏋️','⚽','🏀','🎾','🎮','🎲'] },
  { label: 'Arbeit & Büro', emojis: ['📝','✏️','📊','📈','📉','🗓️','⏰','⏱️','📞','📟','📠','💰','💵','💶','💳','🏦','📦','🛒','🎁','🏷️','🔬','🔭','⚗️','🧪','📚','📖','🗞️','📰'] },
];

/** True if the string matches a known lucide icon name */
export function isIconName(value: string | undefined): value is string {
  return !!value && value in DECISION_ICONS;
}

/** True if the string is set and is NOT a known lucide icon name (i.e. treat as emoji/text) */
export function isEmoji(value: string | undefined): boolean {
  if (!value) return false;
  return !(value in DECISION_ICONS);
}
