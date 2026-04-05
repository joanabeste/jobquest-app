import {
  Briefcase, Star, Heart, Zap, Target, Users, Clock, Globe, Shield, Lightbulb,
  Rocket, TrendingUp, Award, CheckCircle, XCircle, ThumbsUp, ThumbsDown,
  Coffee, Smile, AlertTriangle, HelpCircle, MessageCircle, Phone, Mail,
  Clipboard, Search, Settings, Flag, Bookmark,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const DECISION_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Star,
  Heart,
  Zap,
  Target,
  Users,
  Clock,
  Globe,
  Shield,
  Lightbulb,
  Rocket,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Coffee,
  Smile,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  Clipboard,
  Search,
  Settings,
  Flag,
  Bookmark,
};

/** True if the string matches a known lucide icon name */
export function isIconName(value: string | undefined): value is string {
  return !!value && value in DECISION_ICONS;
}
