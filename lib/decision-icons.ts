import {
  // Work & Office
  Briefcase, Clipboard, FileText, FolderOpen, Printer, Monitor, Laptop, Smartphone,
  Mail, Phone, MessageCircle, MessageSquare, Send, Inbox,
  // People & Social
  Users, User, UserCheck, UserPlus, Heart, Handshake, Baby, HeartHandshake,
  // Actions & Navigation
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronRight, ChevronLeft,
  ThumbsUp, ThumbsDown, Check, CheckCircle, XCircle,
  // Time & Planning
  Clock, Timer, Calendar, CalendarDays, AlarmClock,
  // Nature & Environment
  Sun, Moon, Cloud, Leaf, Flower2, Globe, TreePine,
  // Tools & Tech
  Settings, Wrench, Hammer, Scissors, PenTool, Pencil, Ruler,
  Search, Microscope, FlaskConical, Cpu, Database, Code,
  // Health & Safety
  Shield, ShieldCheck, HeartPulse, Stethoscope, Pill, Syringe,
  // Finance & Business
  TrendingUp, TrendingDown, BarChart, PieChart, DollarSign, Euro, Coins, CreditCard,
  // Energy & Power
  Zap, Flame, Battery, BatteryCharging, Power, Lightbulb,
  // Transport
  Car, Truck, Bike, Plane, Train, Ship,
  // Food & Lifestyle
  Coffee, Pizza, Apple, Utensils, ShoppingCart, ShoppingBag, Gift,
  // Emotions & Fun
  Smile, Frown, Laugh, Meh, Star, Sparkles, Trophy, Award, Medal,
  // Alerts & Info
  AlertTriangle, AlertCircle, Info, HelpCircle, Flag, Bookmark, Bell,
  // Media & Content
  Image, Video, Music, Headphones, Mic, Camera, Play, Pause,
  // Navigation & Location
  MapPin, Map, Compass, Navigation, Home, Building, Building2,
  // Misc
  Rocket, Target, Eye, Lock, Unlock, Key, Package, Box, Layers, Grid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const DECISION_ICONS: Record<string, LucideIcon> = {
  // Work & Office
  Briefcase, Clipboard, FileText, FolderOpen, Printer, Monitor, Laptop, Smartphone,
  Mail, Phone, MessageCircle, MessageSquare, Send, Inbox,
  // People & Social
  Users, User, UserCheck, UserPlus, Heart, Handshake, Baby, HeartHandshake,
  // Actions
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronRight, ChevronLeft,
  ThumbsUp, ThumbsDown, Check, CheckCircle, XCircle,
  // Time & Planning
  Clock, Timer, Calendar, CalendarDays, AlarmClock,
  // Nature
  Sun, Moon, Cloud, Leaf, Flower2, Globe, TreePine,
  // Tools & Tech
  Settings, Wrench, Hammer, Scissors, PenTool, Pencil, Ruler,
  Search, Microscope, FlaskConical, Cpu, Database, Code,
  // Health & Safety
  Shield, ShieldCheck, HeartPulse, Stethoscope, Pill, Syringe,
  // Finance
  TrendingUp, TrendingDown, BarChart, PieChart, DollarSign, Euro, Coins, CreditCard,
  // Energy
  Zap, Flame, Battery, BatteryCharging, Power, Lightbulb,
  // Transport
  Car, Truck, Bike, Plane, Train, Ship,
  // Food & Lifestyle
  Coffee, Pizza, Apple, Utensils, ShoppingCart, ShoppingBag, Gift,
  // Emotions & Fun
  Smile, Frown, Laugh, Meh, Star, Sparkles, Trophy, Award, Medal,
  // Alerts & Info
  AlertTriangle, AlertCircle, Info, HelpCircle, Flag, Bookmark, Bell,
  // Media
  Image, Video, Music, Headphones, Mic, Camera, Play, Pause,
  // Location
  MapPin, Map, Compass, Navigation, Home, Building, Building2,
  // Misc
  Rocket, Target, Eye, Lock, Unlock, Key, Package, Box, Layers, Grid,
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
