'use client';

// App icon set: Iconoir (https://iconoir.com), thin 1.5px line icons that match the
// black/white editorial look. Every component in the app imports icons from here, never
// from an icon library directly, so the set can be swapped in one place.
//
// Names are the app's existing icon names (kept from the lucide era) so call sites stay
// the same. Props follow the same shape: className / size / strokeWidth / fill / color.
import React, { forwardRef } from 'react';
import {
  Archive as IoArchive,
  ArrowDown as IoArrowDown,
  ArrowDownLeft as IoArrowDownLeft,
  ArrowLeft as IoArrowLeft,
  ArrowRight as IoArrowRight,
  ArrowUpRight as IoArrowUpRight,
  Attachment as IoAttachment,
  Bag as IoBag,
  Bell as IoBell,
  BellNotification as IoBellNotification,
  BellOff as IoBellOff,
  BookStack as IoBookStack,
  Building as IoBuilding,
  Calendar as IoCalendar,
  CalendarCheck as IoCalendarCheck,
  CalendarXmark as IoCalendarXmark,
  Camera as IoCamera,
  ChatBubble as IoChatBubble,
  ChatLines as IoChatLines,
  Check as IoCheck,
  CheckCircle as IoCheckCircle,
  CheckSquare as IoCheckSquare,
  Circle as IoCircle,
  ClipboardCheck as IoClipboardCheck,
  Clock as IoClock,
  ClockRotateRight as IoClockRotateRight,
  Cloud as IoCloud,
  CoffeeCup as IoCoffeeCup,
  Cookie as IoCookie,
  Copy as IoCopy,
  Cpu as IoCpu,
  Crown as IoCrown,
  CursorPointer as IoCursorPointer,
  Cutlery as IoCutlery,
  Dashboard as IoDashboard,
  DoubleCheck as IoDoubleCheck,
  Download as IoDownload,
  EditPencil as IoEditPencil,
  Eye as IoEye,
  EyeClosed as IoEyeClosed,
  Filter as IoFilter,
  FireFlame as IoFireFlame,
  Flask as IoFlask,
  Gift as IoGift,
  Globe as IoGlobe,
  GraduationCap as IoGraduationCap,
  Group as IoGroup,
  HalfMoon as IoHalfMoon,
  Hashtag as IoHashtag,
  HomeSimpleDoor as IoHomeSimpleDoor,
  Hourglass as IoHourglass,
  InfoCircle as IoInfoCircle,
  Key as IoKey,
  KeyCommand as IoKeyCommand,
  Label as IoLabel,
  Link as IoLink,
  List as IoList,
  Lock as IoLock,
  LogIn as IoLogIn,
  LogOut as IoLogOut,
  Mail as IoMail,
  MapPin as IoMapPin,
  Medal as IoMedal,
  MediaImage as IoMediaImage,
  Megaphone as IoMegaphone,
  MoreHoriz as IoMoreHoriz,
  MoreVert as IoMoreVert,
  Movie as IoMovie,
  NavArrowDown as IoNavArrowDown,
  NavArrowLeft as IoNavArrowLeft,
  NavArrowRight as IoNavArrowRight,
  NavArrowUp as IoNavArrowUp,
  OpenBook as IoOpenBook,
  OpenNewWindow as IoOpenNewWindow,
  Page as IoPage,
  PasteClipboard as IoPasteClipboard,
  Pause as IoPause,
  Phone as IoPhone,
  Play as IoPlay,
  Plus as IoPlus,
  PlusSquare as IoPlusSquare,
  Position as IoPosition,
  Prohibition as IoProhibition,
  Refresh as IoRefresh,
  Repeat as IoRepeat,
  SeaAndSun as IoSeaAndSun,
  Search as IoSearch,
  SendDiagonal as IoSendDiagonal,
  Settings as IoSettings,
  ShareAndroid as IoShareAndroid,
  ShareIos as IoShareIos,
  Shield as IoShield,
  ShieldAlert as IoShieldAlert,
  ShieldCheck as IoShieldCheck,
  ShoppingBag as IoShoppingBag,
  SmartphoneDevice as IoSmartphoneDevice,
  Sparks as IoSparks,
  Star as IoStar,
  StatsReport as IoStatsReport,
  SunLight as IoSunLight,
  Table2Columns as IoTable2Columns,
  ThumbsDown as IoThumbsDown,
  ThumbsUp as IoThumbsUp,
  Trash as IoTrash,
  Undo as IoUndo,
  Upload as IoUpload,
  User as IoUser,
  UserBadgeCheck as IoUserBadgeCheck,
  UserCircle as IoUserCircle,
  UserPlus as IoUserPlus,
  UserSquare as IoUserSquare,
  UserXmark as IoUserXmark,
  ViewColumns2 as IoViewColumns2,
  ViewGrid as IoViewGrid,
  WarningCircle as IoWarningCircle,
  WarningTriangle as IoWarningTriangle,
  Wrench as IoWrench,
  Xmark as IoXmark,
  TriangleFlag as IoTriangleFlag,
  XmarkCircle as IoXmarkCircle,
  Notes as IoNotes,
} from 'iconoir-react';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  color?: string;
}
export type LucideIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
export type LucideProps = IconProps;

type IconoirComp = React.ComponentType<React.SVGProps<SVGSVGElement> & { ref?: React.Ref<SVGSVGElement> }>;

// Iconoir is drawn for a 1.5px stroke; lucide call sites ask for 2 by default.
// Scale explicit stroke widths down so "bold" icons stay proportionally lighter.
const scaleStroke = (sw?: number | string) => (sw === undefined ? undefined : Number(sw) * 0.75);

function wrap(Comp: IconoirComp, name: string): LucideIcon {
  const C = forwardRef<SVGSVGElement, IconProps>(({ size, strokeWidth, absoluteStrokeWidth: _a, ...rest }, ref) => (
    <Comp
      ref={ref}
      width={size ?? 24}
      height={size ?? 24}
      strokeWidth={scaleStroke(strokeWidth) ?? 1.5}
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    />
  ));
  C.displayName = name;
  return C;
}

// Spinner: Iconoir has no loader, so this is a matching 1.5px arc.
export const Loader2: LucideIcon = forwardRef<SVGSVGElement, IconProps>(({ size, strokeWidth, absoluteStrokeWidth: _a, ...rest }, ref) => (
  <svg
    ref={ref}
    width={size ?? 24}
    height={size ?? 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={scaleStroke(strokeWidth) ?? 1.5}
    strokeLinecap="round"
    aria-hidden={rest['aria-label'] ? undefined : true}
    {...rest}
  >
    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
  </svg>
));
Loader2.displayName = 'Loader2';

export const AlertCircle = wrap(IoWarningCircle, 'AlertCircle');
export const AlertTriangle = wrap(IoWarningTriangle, 'AlertTriangle');
export const ArrowDown = wrap(IoArrowDown, 'ArrowDown');
export const ArrowLeft = wrap(IoArrowLeft, 'ArrowLeft');
export const ArrowRight = wrap(IoArrowRight, 'ArrowRight');
export const ArrowUpRight = wrap(IoArrowUpRight, 'ArrowUpRight');
export const Award = wrap(IoMedal, 'Award');
export const Backpack = wrap(IoBag, 'Backpack');
export const Ban = wrap(IoProhibition, 'Ban');
export const BarChart3 = wrap(IoStatsReport, 'BarChart3');
export const Bell = wrap(IoBell, 'Bell');
export const BellOff = wrap(IoBellOff, 'BellOff');
export const BellRing = wrap(IoBellNotification, 'BellRing');
export const BookOpen = wrap(IoOpenBook, 'BookOpen');
export const Bot = wrap(IoCpu, 'Bot');
export const Building2 = wrap(IoBuilding, 'Building2');
export const Calendar = wrap(IoCalendar, 'Calendar');
export const CalendarIcon = Calendar;
export const CalendarDays = wrap(IoCalendar, 'CalendarDays');
export const CalendarOff = wrap(IoCalendarXmark, 'CalendarOff');
export const CalendarRange = wrap(IoCalendarCheck, 'CalendarRange');
export const Camera = wrap(IoCamera, 'Camera');
export const Check = wrap(IoCheck, 'Check');
export const CheckCheck = wrap(IoDoubleCheck, 'CheckCheck');
export const CheckCircle = wrap(IoCheckCircle, 'CheckCircle');
export const CheckCircle2 = wrap(IoCheckCircle, 'CheckCircle2');
export const CheckSquare = wrap(IoCheckSquare, 'CheckSquare');
export const ChevronDown = wrap(IoNavArrowDown, 'ChevronDown');
export const ChevronLeft = wrap(IoNavArrowLeft, 'ChevronLeft');
export const ChevronRight = wrap(IoNavArrowRight, 'ChevronRight');
export const ChevronUp = wrap(IoNavArrowUp, 'ChevronUp');
export const Circle = wrap(IoCircle, 'Circle');
export const ClipboardCheck = wrap(IoClipboardCheck, 'ClipboardCheck');
export const ClipboardList = wrap(IoPasteClipboard, 'ClipboardList');
export const Clock = wrap(IoClock, 'Clock');
export const Cloud = wrap(IoCloud, 'Cloud');
export const Coffee = wrap(IoCoffeeCup, 'Coffee');
export const Command = wrap(IoKeyCommand, 'Command');
export const Cookie = wrap(IoCookie, 'Cookie');
export const Copy = wrap(IoCopy, 'Copy');
export const CornerDownLeft = wrap(IoArrowDownLeft, 'CornerDownLeft');
export const Crosshair = wrap(IoPosition, 'Crosshair');
export const Crown = wrap(IoCrown, 'Crown');
export const Download = wrap(IoDownload, 'Download');
export const Edit2 = wrap(IoEditPencil, 'Edit2');
export const Edit3 = wrap(IoEditPencil, 'Edit3');
export const ExternalLink = wrap(IoOpenNewWindow, 'ExternalLink');
export const Eye = wrap(IoEye, 'Eye');
export const EyeOff = wrap(IoEyeClosed, 'EyeOff');
export const FileSpreadsheet = wrap(IoTable2Columns, 'FileSpreadsheet');
export const FileText = wrap(IoPage, 'FileText');
export const Film = wrap(IoMovie, 'Film');
export const Filter = wrap(IoFilter, 'Filter');
export const Flame = wrap(IoFireFlame, 'Flame');
export const FlaskConical = wrap(IoFlask, 'FlaskConical');
export const Globe = wrap(IoGlobe, 'Globe');
export const GraduationCap = wrap(IoGraduationCap, 'GraduationCap');
export const Hash = wrap(IoHashtag, 'Hash');
export const History = wrap(IoClockRotateRight, 'History');
export const Home = wrap(IoHomeSimpleDoor, 'Home');
export const House = wrap(IoHomeSimpleDoor, 'House');
export const Hourglass = wrap(IoHourglass, 'Hourglass');
export const IdCard = wrap(IoUserSquare, 'IdCard');
export const ImageIcon = wrap(IoMediaImage, 'ImageIcon');
export const Image = ImageIcon;
export const Inbox = wrap(IoArchive, 'Inbox');
export const Info = wrap(IoInfoCircle, 'Info');
export const Key = wrap(IoKey, 'Key');
export const KeyRound = wrap(IoKey, 'KeyRound');
export const Layers = wrap(IoBookStack, 'Layers');
export const LayoutDashboard = wrap(IoDashboard, 'LayoutDashboard');
export const LayoutGrid = wrap(IoViewGrid, 'LayoutGrid');
export const LayoutTemplate = wrap(IoViewColumns2, 'LayoutTemplate');
export const Link = wrap(IoLink, 'Link');
export const Link2 = wrap(IoLink, 'Link2');
export const List = wrap(IoList, 'List');
export const Lock = wrap(IoLock, 'Lock');
export const LogIn = wrap(IoLogIn, 'LogIn');
export const LogOut = wrap(IoLogOut, 'LogOut');
export const Mail = wrap(IoMail, 'Mail');
export const MapPin = wrap(IoMapPin, 'MapPin');
export const Megaphone = wrap(IoMegaphone, 'Megaphone');
export const MessageCircle = wrap(IoChatBubble, 'MessageCircle');
export const MessageSquare = wrap(IoChatLines, 'MessageSquare');
export const Moon = wrap(IoHalfMoon, 'Moon');
export const MoreHorizontal = wrap(IoMoreHoriz, 'MoreHorizontal');
export const MoreVertical = wrap(IoMoreVert, 'MoreVertical');
export const MousePointer = wrap(IoCursorPointer, 'MousePointer');
export const Palmtree = wrap(IoSeaAndSun, 'Palmtree');
export const Paperclip = wrap(IoAttachment, 'Paperclip');
export const PartyPopper = wrap(IoGift, 'PartyPopper');
export const Pause = wrap(IoPause, 'Pause');
export const Pencil = wrap(IoEditPencil, 'Pencil');
export const NotebookPen = wrap(IoNotes, 'NotebookPen');
export const Phone = wrap(IoPhone, 'Phone');
export const Play = wrap(IoPlay, 'Play');
export const Plus = wrap(IoPlus, 'Plus');
export const PlusSquare = wrap(IoPlusSquare, 'PlusSquare');
export const RefreshCw = wrap(IoRefresh, 'RefreshCw');
export const Repeat = wrap(IoRepeat, 'Repeat');
export const RotateCcw = wrap(IoUndo, 'RotateCcw');
export const School = wrap(IoBuilding, 'School');
export const Search = wrap(IoSearch, 'Search');
export const Send = wrap(IoSendDiagonal, 'Send');
export const Settings = wrap(IoSettings, 'Settings');
export const Share = wrap(IoShareIos, 'Share');
export const Share2 = wrap(IoShareAndroid, 'Share2');
export const Shield = wrap(IoShield, 'Shield');
export const ShieldAlert = wrap(IoShieldAlert, 'ShieldAlert');
export const ShieldCheck = wrap(IoShieldCheck, 'ShieldCheck');
export const ShoppingBag = wrap(IoShoppingBag, 'ShoppingBag');
export const Smartphone = wrap(IoSmartphoneDevice, 'Smartphone');
export const Sparkles = wrap(IoSparks, 'Sparkles');
export const Star = wrap(IoStar, 'Star');
export const Sun = wrap(IoSunLight, 'Sun');
export const Tag = wrap(IoLabel, 'Tag');
export const ThumbsDown = wrap(IoThumbsDown, 'ThumbsDown');
export const ThumbsUp = wrap(IoThumbsUp, 'ThumbsUp');
export const Trash2 = wrap(IoTrash, 'Trash2');
export const Upload = wrap(IoUpload, 'Upload');
export const User = wrap(IoUser, 'User');
export const UserCheck = wrap(IoUserBadgeCheck, 'UserCheck');
export const UserCog = wrap(IoUserCircle, 'UserCog');
export const UserMinus = wrap(IoUserXmark, 'UserMinus');
export const UserPlus = wrap(IoUserPlus, 'UserPlus');
export const Users = wrap(IoGroup, 'Users');
export const Utensils = wrap(IoCutlery, 'Utensils');
export const UtensilsCrossed = wrap(IoCutlery, 'UtensilsCrossed');
export const Vote = wrap(IoCheckSquare, 'Vote');
export const Wrench = wrap(IoWrench, 'Wrench');
export const X = wrap(IoXmark, 'X');
export const Flag = wrap(IoTriangleFlag, 'Flag');
export const ShieldOff = wrap(IoProhibition, 'ShieldOff');
export const XCircle = wrap(IoXmarkCircle, 'XCircle');
