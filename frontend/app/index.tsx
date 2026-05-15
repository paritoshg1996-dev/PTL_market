	import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,

  StyleSheet,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Modal,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";

const API = `https://ptl-market.onrender.com/api`;

const COLORS = {
  primary: "#0A2463",
  secondary: "#FF6B35",
  success: "#248232",
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  textMuted: "#6C757D",
  textSubtle: "#ADB5BD",
  border: "#DEE2E6",
  danger: "#DC3545",
};

const PLACEMENT = ["Stackable", "Non Stackable"];
const PLACEMENT_OPTIONS = [
  { key: "Stackable",     label: "Stackable",     image: require("../assets/images/stackable.png") },
  { key: "Non Stackable", label: "Non Stackable",  image: require("../assets/images/non_stackable.png") },
];
const TRUCK_TYPES: { name: string; image: any }[] = [
  { name: "Open", image: require("../assets/trucks/open.png") },
  { name: "Container", image: require("../assets/trucks/container.png") },
  { name: "Trailer", image: require("../assets/trucks/trailer.png") },
];

type Profile = { name: string; phone: string; company: string };

type Load = {
  id: string;
  origin_pincode: string;
  origin_city: string;
  origin_state: string;
  destination_pincode: string;
  destination_city: string;
  destination_state: string;
  cargo_types: string[];
  cargo_placement: string;
  weight_tons: number;
  space_cuft: number | null;
  loading_date: string;
  poster_name: string;
  poster_phone: string;
  poster_company: string;
  created_at: string;
  truck_type?: string;
  images?: string[];
  image_count?: number;
};

type MapplsSuggestion = {
  placeName: string;
  placeAddress: string;
  eLoc: string;
};

// Extract 6-digit pincode from Mappls placeAddress string
function extractPincode(address: string): string {
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : "";
}

// ============== Root ==============
export default function Index() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"post" | "market">("post");
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("profile");
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch {}
      }
      setLoaded(true);
    })();
  }, []);

  const saveProfile = async (p: Profile) => {
    await AsyncStorage.setItem("profile", JSON.stringify(p));
    setProfile(p);
  };

  if (!loaded) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!profile) return <ProfileSetup onSave={saveProfile} />;

  if (showProfile) {
    return (
      <ProfileScreen
        profile={profile}
        onClose={() => setShowProfile(false)}
        onEdit={() => { setShowProfile(false); setProfile(null); }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={["top"]}>
      <View style={styles.header} testID="app-header">
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="cube" size={20} color={COLORS.surface} />
          </View>
          <View>
            <Text style={styles.headerTitle}>LoadLink</Text>
            <Text style={styles.headerSubtitle}>Hi, {profile.name.split(" ")[0]}</Text>
          </View>
        </View>
        <TouchableOpacity testID="open-profile-btn" onPress={() => setShowProfile(true)} style={styles.iconBtn}>
          <Ionicons name="person-circle-outline" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs} testID="tabs">
        <TabButton label="Post Space" icon="add-circle-outline" active={tab === "post"} onPress={() => setTab("post")} testID="tab-post" />
        <TabButton label="Load Market" icon="list-outline" active={tab === "market"} onPress={() => setTab("market")} testID="tab-market" />
      </View>

      <View style={styles.fill}>
        {tab === "post" ? (
          <PostLoadScreen profile={profile} onPosted={() => setTab("market")} />
        ) : (
          <LoadMarketScreen profile={profile} />
        )}
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, icon, active, onPress, testID }: any) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Ionicons name={icon} size={18} color={active ? COLORS.primary : COLORS.textMuted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============== Profile Setup ==============
function ProfileSetup({ onSave }: { onSave: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const submit = () => {
    if (name.trim().length < 2) return Alert.alert("Required", "Please enter your name");
    if (!/^\d{10}$/.test(phone.trim())) return Alert.alert("Invalid", "Enter a 10-digit phone number");
    onSave({ name: name.trim(), phone: phone.trim(), company: company.trim() });
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.profileWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.profileLogo}>
            <Ionicons name="cube" size={36} color={COLORS.surface} />
          </View>
          <Text style={styles.profileTitle}>Welcome to LoadLink</Text>
          <Text style={styles.profileSubtitle}>Set up your profile to start posting and finding loads</Text>
          <View style={{ height: 24 }} />
          <Field label="Your Name *">
            <TextInput testID="profile-name-input" style={styles.input} placeholder="e.g., Rajesh Kumar" placeholderTextColor={COLORS.textSubtle} value={name} onChangeText={setName} />
          </Field>
          <Field label="Phone Number *">
            <TextInput testID="profile-phone-input" style={styles.input} placeholder="10-digit mobile number" placeholderTextColor={COLORS.textSubtle} value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" maxLength={10} />
          </Field>
          <Field label="Company (Optional)">
            <TextInput testID="profile-company-input" style={styles.input} placeholder="Transport company name" placeholderTextColor={COLORS.textSubtle} value={company} onChangeText={setCompany} />
          </Field>
          <TouchableOpacity testID="profile-save-btn" style={styles.primaryBtn} onPress={submit}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============== Profile Screen ==============
function ProfileScreen({ profile, onClose, onEdit }: { profile: Profile; onClose: () => void; onEdit: () => void }) {
  const [myLoads, setMyLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMy = useCallback(async () => {
    try {
      const r = await fetch(`${API}/loads`);
      const j: Load[] = await r.json();
      setMyLoads(j.filter((l) => l.poster_phone === profile.phone));
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, [profile.phone]);

  useEffect(() => { fetchMy(); }, [fetchMy]);

  const initials = profile.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <SafeAreaView style={styles.fill} edges={["top"]}>
      <View style={styles.header} testID="profile-header">
        <TouchableOpacity testID="profile-back-btn" onPress={onClose} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity testID="profile-edit-btn" onPress={onEdit} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        testID="my-loads-list"
        data={loading ? [] : myLoads}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMy(); }} />}
        ListHeaderComponent={
          <>
            <View style={styles.profileCard} testID="profile-card">
              <View style={styles.avatarBig}><Text style={styles.avatarBigText}>{initials || "?"}</Text></View>
              <Text style={styles.profileCardName} testID="profile-card-name">{profile.name}</Text>
              {profile.company ? <Text style={styles.profileCardCompany} testID="profile-card-company">{profile.company}</Text> : null}
              <View style={styles.profilePhoneRow}>
                <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.profileCardPhone} testID="profile-card-phone">+91 {profile.phone}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statValue} testID="my-loads-count">{myLoads.length}</Text><Text style={styles.statLabel}>Loads Posted</Text></View>
              <View style={styles.statBox}><Text style={styles.statValue}>{myLoads.reduce((s, l) => s + (l.weight_tons || 0), 0).toFixed(1)} T</Text><Text style={styles.statLabel}>Total Weight</Text></View>
              <View style={styles.statBox}><Text style={styles.statValue}>{myLoads.reduce((s, l) => s + (l.space_cuft || 0), 0).toFixed(0)}</Text><Text style={styles.statLabel}>Total ft³</Text></View>
            </View>
            <Text style={styles.sectionHeading}>My Posted Loads</Text>
            {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} /> : null}
          </>
        }
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyWrap} testID="profile-empty">
            <Ionicons name="cube-outline" size={42} color={COLORS.textSubtle} />
            <Text style={styles.emptyTitle}>No loads posted yet</Text>
            <Text style={styles.emptySub}>Post your first load to see it listed here.</Text>
          </View>
        ) : null}
        renderItem={({ item }) => <LoadCard load={item} isMine={true} />}
      />
    </SafeAreaView>
  );
}

// ============== Post Load ==============
function PostLoadScreen({ profile, onPosted }: { profile: Profile; onPosted: () => void }) {
  const [originText, setOriginText] = useState("");
  const [originPin, setOriginPin] = useState("");
  const [originInfo, setOriginInfo] = useState<{ city: string; state: string; valid: boolean } | null>(null);
  const [destText, setDestText] = useState("");
  const [destPin, setDestPin] = useState("");
  const [destInfo, setDestInfo] = useState<{ city: string; state: string; valid: boolean } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [placement, setPlacement] = useState<string>("Stackable");
  const [truckType, setTruckType] = useState<string>("");
 
const [weight, setWeight] = useState(1.0);
const [date, setDate] = useState<Date>(new Date());

const changeDate = (days: number) => {
  setDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + days);
    if (d < new Date(new Date().setHours(0,0,0,0))) return prev;
    return d;
  });
};
  
	
  const [loadingPost, setLoadingPost] = useState(false);

  const pickImage = async () => {
    if (images.length >= 3) { Alert.alert("Limit", "You can attach up to 3 photos."); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Please grant photo library access to attach images."); return; }
    const remaining = 3 - images.length;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.5, base64: true });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      const newOnes = res.assets.slice(0, remaining).filter((a: any) => !!a.base64).map((a: any) => `data:${a.mimeType || "image/jpeg"};base64,${a.base64}`);
      setImages((prev) => [...prev, ...newOnes].slice(0, 3));
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (alsoShare: boolean) => {
    if (!/^\d{6}$/.test(originPin)) return Alert.alert("Invalid Origin", "Enter a valid 6-digit pincode or pick a city from the list.");
    if (!/^\d{6}$/.test(destPin)) return Alert.alert("Invalid Destination", "Enter a valid 6-digit pincode or pick a city from the list.");
    if (!truckType) return Alert.alert("Required", "Select a truck type");
const w = weight;
if (!w || w <= 0) return Alert.alert("Invalid", "Enter valid weight in tons");
    
    setLoadingPost(true);
    try {
      const payload = {
        origin_pincode: originPin, origin_city: originInfo?.city || "", origin_state: originInfo?.state || "",
        destination_pincode: destPin, destination_city: destInfo?.city || "", destination_state: destInfo?.state || "",
        cargo_types: [], cargo_placement: placement, truck_type: truckType, weight_tons: w, space_cuft: null,
        loading_date: date.toISOString().slice(0, 10), poster_name: profile.name, poster_phone: profile.phone,
        poster_company: profile.company, images,
      };
      const res = await fetch(`${API}/loads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to post");
      const created = await res.json();

      const reset = () => {
        setOriginText(""); setOriginPin(""); setOriginInfo(null);
        setDestText(""); setDestPin(""); setDestInfo(null);
        setTruckType(""); setPlacement("Stackable"); setWeight(""); setImages([]);
      };

      if (alsoShare) {
        const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const originLine = originInfo?.city ? `${originPin} (${originInfo.city}, ${originInfo.state})` : originPin;
        const destLine = destInfo?.city ? `${destPin} (${destInfo.city}, ${destInfo.state})` : destPin;
        let imageLines = "";
        if (images.length > 0 && created?.id) {
          const longUrls = images.map((_, i) => `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/loads/${created.id}/image/${i}`);
          const shortened = await Promise.all(longUrls.map(async (u) => {
            try {
              const r = await fetch(`${API}/shorten`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: u }) });
              const j = await r.json(); return j.short || u;
            } catch { return u; }
          }));
          imageLines = `\n📸 *Photos:*\n` + shortened.join("\n");
        }
        const text = `🚛 *Truck Space Available – LoadLink*\n\n📍 *Route:* ${originLine} ➡️ ${destLine}\n🚚 *Truck:* ${truckType}\n⚖️ *Weight:* ${w} Tons\n` +
          `📅 *Loading:* ${dateStr}\n🧱 *Placement:* ${placement}\n${imageLines}\n\n📞 *Contact:* ${profile.name}` +
          (profile.company ? ` — ${profile.company}` : "") + `\n+91 ${profile.phone}`;
        try { await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`); } catch {
          Alert.alert("Posted", "Load posted, but WhatsApp could not be opened.");
        }
        reset(); onPosted();
      } else {
        Alert.alert("Posted!", "Your load has been added to the market.", [{ text: "View Market", onPress: () => { reset(); onPosted(); } }]);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to post load. Please try again.");
    } finally {
      setLoadingPost(false);
    }
  };

return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.fill}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={styles.formWrap}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        testID="post-load-form"
      >
		  
     <SectionTitle icon="navigate-outline" title="Route" />
<View style={styles.routeInputsRow}>
  <View style={styles.routeInputBox}>
    <Text style={styles.routeBoxLabel}>Origin</Text>
    <SmartRouteInput
      label=""
      testIDPrefix="origin"
      text={originText}
      pin={originPin}
      info={originInfo}
      onChange={(t, pin, info) => {
        setOriginText(t);
        setOriginPin(pin);
        setOriginInfo(info);
      }}
    />
  </View>
  <View style={styles.routeArrowMid}>
    <Ionicons name="arrow-forward" size={20} color={COLORS.secondary} />
  </View>
  <View style={styles.routeInputBox}>
    <Text style={styles.routeBoxLabel}>Destination</Text>
    <SmartRouteInput
      label=""
      testIDPrefix="dest"
      text={destText}
      pin={destPin}
      info={destInfo}
      onChange={(t, pin, info) => {
        setDestText(t);
        setDestPin(pin);
        setDestInfo(info);
      }}
    />
  </View>
</View>
        <SectionTitle icon="bus-outline" title="Truck Type" />
        <View style={styles.truckRow} testID="truck-types-row">
          {TRUCK_TYPES.map((t) => {
            const on = truckType === t.name;
            return (
              <TouchableOpacity key={t.name} testID={`truck-type-${t.name.replace(/\s+/g, "-")}`} onPress={() => setTruckType(t.name)} style={[styles.truckCard, on && styles.truckCardOn]} activeOpacity={0.7}>
                <Image source={t.image} style={[styles.truckImg, on && styles.truckImgOn]} resizeMode="contain" />
                <Text style={[styles.truckLabel, on && styles.truckLabelOn]} numberOfLines={1}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

<SectionTitle icon="scale-outline" title="Weight Capacity" />
<View style={styles.stepperRow}>
  <TouchableOpacity
    style={styles.stepperBtn}
    onPress={() => setWeight(w => Math.max(0.5, parseFloat((w - 0.5).toFixed(1))))}
  >
    <Text style={styles.stepperBtnText}>−</Text>
  </TouchableOpacity>
  <TouchableOpacity
  style={styles.stepperCenter}
  activeOpacity={0.8}
  onPress={() => {
    Alert.prompt(
      "Weight Capacity",
      "Enter weight in tons",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: (v) => {
            const n = parseFloat(v || "");

            if (!isNaN(n) && n > 0) {
              setWeight(n);
            }
          },
        },
      ],
      "plain-text",
      String(weight)
    );
  }}
>
  <Text style={styles.stepperValue}>
    {weight.toFixed(1)}
  </Text>

  <Text style={styles.stepperUnit}>
    tons
  </Text>
</TouchableOpacity>
  <TouchableOpacity
    style={styles.stepperBtn}
    onPress={() => setWeight(w => parseFloat((w + 0.5).toFixed(1)))}
  >
    <Text style={styles.stepperBtnText}>+</Text>
  </TouchableOpacity>
</View>


		  
     <SectionTitle icon="layers-outline" title="Cargo Placement" />
<View style={styles.placementRow} testID="placement-segment">
  {PLACEMENT_OPTIONS.map((p) => {
    const on = placement === p.key;
    return (
      <TouchableOpacity
        key={p.key}
        testID={`placement-${p.key.replace(" ", "-")}`}
        style={[styles.placementCard, on && (p.key === "Stackable" ? styles.placementCardGreen : styles.placementCardRed)]}
        onPress={() => setPlacement(p.key)}
        activeOpacity={0.7}
      >
        <Image source={p.image} style={styles.placementImg} resizeMode="contain" />
        <Text style={[styles.placementLabel, on && (p.key === "Stackable" ? styles.placementLabelGreen : styles.placementLabelRed)]}>
          {p.label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>
        <SectionTitle icon="image-outline" title="Photos (optional)" />
        <Text style={styles.label}>Attach up to 3 photos of the truck or available space</Text>
        <View style={styles.photoRow} testID="photos-row">
          {[0, 1, 2].map((idx) => {
            const img = images[idx];
            if (img) {
              return (
                <View key={idx} style={styles.photoCell} testID={`photo-${idx}`}>
                  <Image source={{ uri: img }} style={styles.photoImg} resizeMode="cover" />
                  <TouchableOpacity testID={`photo-remove-${idx}`} onPress={() => removeImage(idx)} style={styles.photoRemoveBtn}>
                    <Ionicons name="close" size={14} color={COLORS.surface} />
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <TouchableOpacity key={idx} testID={`photo-add-${idx}`} onPress={pickImage} style={[styles.photoCell, styles.photoEmpty]} activeOpacity={0.7}>
                <Ionicons name="add" size={28} color={COLORS.textMuted} />
                <Text style={styles.photoAddLabel}>Add</Text>
              </TouchableOpacity>
            );
          })}
        </View>


      <SectionTitle icon="calendar-outline" title="Loading Date" />
<View style={styles.stepperRow}>
  <TouchableOpacity style={styles.stepperBtn} onPress={() => changeDate(-1)}>
    <Text style={styles.stepperBtnText}>−</Text>
  </TouchableOpacity>
  <View style={styles.stepperCenter}>
    <Ionicons name="calendar" size={14} color={COLORS.primary} />
    <Text style={styles.stepperDateText}>
      {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
    </Text>
  </View>
  <TouchableOpacity style={styles.stepperBtn} onPress={() => changeDate(1)}>
    <Text style={styles.stepperBtnText}>+</Text>
  </TouchableOpacity>
</View>

        <View style={[styles.row, { marginTop: 24 }]}>
          <TouchableOpacity testID="submit-load-btn" style={[styles.primaryBtn, styles.flex1, { marginTop: 0 }]} onPress={() => submit(false)} disabled={loadingPost}>
            {loadingPost ? <ActivityIndicator color={COLORS.surface} /> : <><Ionicons name="checkmark-circle" size={18} color={COLORS.surface} /><Text style={styles.primaryBtnText}>Post</Text></>}
          </TouchableOpacity>
          <View style={{ width: 10 }} />
          <TouchableOpacity testID="submit-load-share-btn" style={[styles.whatsappBtn, styles.flex1]} onPress={() => submit(true)} disabled={loadingPost}>
            {loadingPost ? <ActivityIndicator color={COLORS.surface} /> : <><Ionicons name="logo-whatsapp" size={18} color={COLORS.surface} /><Text style={styles.primaryBtnText}>Post & Share</Text></>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>

	   );
}

function PincodeHint({ info, pin, testID }: any) {
  if (!pin || pin.length < 6) return null;
  if (!info) return <Text style={styles.hintMuted} testID={testID}>Looking up...</Text>;
  if (!info.valid) return <Text style={[styles.hintMuted, { color: COLORS.danger }]} testID={testID}>Pincode not found</Text>;
  return <Text style={styles.hintOk} testID={testID}><Ionicons name="checkmark-circle" size={12} color={COLORS.success} /> {info.city}, {info.state}</Text>;
}

type CitySuggestion = { name: string; city: string; state: string; pincode: string };
type RouteInfo = { city: string; state: string; valid: boolean } | null;

function VoiceListenOverlay({ visible, onCancel, status }: { visible: boolean; onCancel: () => void; status: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  const ring = () => ({
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.voiceBackdrop} testID="voice-overlay">
        <View style={styles.voiceCard}>
          <View style={styles.voicePulseWrap}>
            <Animated.View style={[styles.voiceRing, ring()]} />
            <Animated.View style={[styles.voiceRing, ring()]} />
            <View style={styles.voiceMicBox}><Ionicons name="mic" size={42} color={COLORS.surface} /></View>
          </View>
          <Text style={styles.voiceTitle}>Listening…</Text>
          <Text style={styles.voiceSub}>{status}</Text>
          <TouchableOpacity testID="voice-cancel-btn" onPress={onCancel} style={styles.voiceCancelBtn}>
            <Text style={styles.voiceCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============== SmartRouteInput (Post Load - uses /city endpoint) ==============
function SmartRouteInput({ label, testIDPrefix, text, pin, info, onChange }: {
  label: string; testIDPrefix: string; text: string; pin: string; info: RouteInfo;
  onChange: (text: string, pin: string, info: RouteInfo) => void;
}) {
  const isPincodeMode = text.length === 0 || /^\d/.test(text);
  const [results, setResults] = useState<CitySuggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Speak the city name or pincode");

useEffect(() => {
  if (isPincodeMode) { setResults(null); return; }
  const q = text.trim();
  if (q.length < 3) { setResults(null); return; }
  let cancelled = false;
  setSearching(true);
  const t = setTimeout(async () => {
    try {
      const r = await fetch(`${API}/places?query=${encodeURIComponent(q)}`);
      const data = await r.json();
      const mapped: CitySuggestion[] = (data.suggestedLocations || [])
        .slice(0, 8)
        .map((s: any) => {
          const pincodeMatch = (s.placeAddress || "").match(/\b(\d{6})\b/);
          const pincode = pincodeMatch ? pincodeMatch[1] : "";
          return {
            name: s.placeName,
            city: s.placeAddress || "",
            state: "",
            pincode,
          };
        })
        .filter((s: CitySuggestion) => s.pincode); // only show results with a pincode
      if (!cancelled) setResults(mapped);
    } catch { if (!cancelled) setResults([]); }
    finally { if (!cancelled) setSearching(false); }
  }, 350);
  return () => { cancelled = true; clearTimeout(t); };
}, [text, isPincodeMode]);

  useEffect(() => {
    if (!isPincodeMode) return;
    if (text.length === 6) {
      let cancelled = false;
      (async () => {
        try {
          const r = await fetch(`${API}/pincode/${text}`);
          const j = await r.json();
          if (!cancelled) onChange(text, text, { city: j.city || "", state: j.state || "", valid: !!j.valid });
        } catch { if (!cancelled) onChange(text, text, { city: "", state: "", valid: false }); }
      })();
      return () => { cancelled = true; };
    }
  }, [text, isPincodeMode]);

  const handleChange = (t: string) => {
    if (t.length === 0) { onChange("", "", null); setResults(null); return; }
    if (/^\d/.test(t)) {
      const cleaned = t.replace(/\D/g, "").slice(0, 6);
      onChange(cleaned, cleaned.length === 6 ? cleaned : "", null);
    } else { onChange(t, "", null); }
  };

  const pick = (s: CitySuggestion) => { onChange(s.name, s.pincode, { city: s.city, state: s.state, valid: true }); setResults(null); };

  const stopVoice = useCallback(() => { try { ExpoSpeechRecognitionModule.stop(); } catch {} setListening(false); }, []);

  useSpeechRecognitionEvent("result", (event: any) => {
    if (!listening) return;
    const transcript: string = event?.results?.[0]?.transcript || "";
    if (event?.isFinal) { const cleaned = transcript.replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim(); if (cleaned) handleChange(cleaned); stopVoice(); }
    else if (transcript) setVoiceStatus(`Heard: "${transcript.trim()}"`);
  });

  useSpeechRecognitionEvent("error", (event: any) => {
    if (!listening) return;
    const msg = event?.error || "error";
    if (msg === "not-allowed" || msg === "service-not-allowed" || msg === "permissions") setVoiceStatus("Microphone permission denied");
    else if (msg === "no-speech") setVoiceStatus("Didn't catch that. Try again.");
    else setVoiceStatus(`Error: ${msg}`);
    setTimeout(stopVoice, 1200);
  });

  useSpeechRecognitionEvent("end", () => { if (!listening) return; setListening(false); });

  const startVoice = async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm?.granted) { Alert.alert("Microphone needed", "Please grant microphone permission to use voice input."); return; }
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
      setVoiceStatus("Speak the city name or pincode");
      setListening(true);
      ExpoSpeechRecognitionModule.start({ lang: "en-IN", interimResults: true, continuous: false, maxAlternatives: 1, addsPunctuation: false });
    } catch (err) { console.warn("Voice start failed:", err); setListening(false); Alert.alert("Voice not available", "Voice input is not available on this device."); }
  };

  const showSuggestions = !isPincodeMode && text.trim().length >= 3 && results && results.length > 0;
  const showNoMatch = !isPincodeMode && !searching && results && results.length === 0 && text.trim().length >= 3;
  const showShortHint = !isPincodeMode && text.trim().length > 0 && text.trim().length < 3;

  
	
	return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.inputWithIconWrap}>
        {pin && info?.valid ? (
          <View style={styles.selectedRouteCard}>
            <Text style={styles.selectedRoutePin}>{pin}</Text>
            <Text style={styles.selectedRouteCity} numberOfLines={2}>{info.city}</Text>
          </View>
        ) : (
          <TextInput
            testID={`${testIDPrefix}-input`}
            style={[styles.input, { paddingRight: 50 }]}
            placeholder="Pincode (e.g., 400069), city or speak it"
            placeholderTextColor={COLORS.textSubtle}
            value={text}
            onChangeText={handleChange}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={isPincodeMode ? 6 : 60}
          />
        )}

        {pin && info?.valid ? (
          <TouchableOpacity style={styles.changeRouteBtn} onPress={() => onChange("", "", null)}>
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={styles.changeRouteText}>Change</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity testID={`${testIDPrefix}-mic-btn`} onPress={startVoice} style={styles.micBtnAbs} activeOpacity={0.7}>
          <Ionicons name="mic" size={20} color={listening ? COLORS.secondary : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {listening ? (
        <View style={styles.voiceInlineStatus} testID={`${testIDPrefix}-voice-inline`}>
          <Ionicons name="radio-outline" size={12} color={COLORS.primary} />
          <Text style={styles.voiceInlineText}>{voiceStatus}</Text>
        </View>
      ) : null}
      {isPincodeMode && text.length > 0 ? <PincodeHint info={info} pin={text} testID={`${testIDPrefix}-pincode-hint`} /> : null}
      {showShortHint ? <Text style={styles.hintMuted}>Type at least 3 letters to search…</Text> : null}
      {!isPincodeMode && searching ? <Text style={styles.hintMuted}>Searching…</Text> : null}
      {showNoMatch ? <Text style={[styles.hintMuted, { color: COLORS.danger }]}>No matches. Try a different spelling.</Text> : null}

      {/* Dropdown as full-screen Modal so it never gets clipped */}
      <Modal
        visible={showSuggestions === true}
        transparent
        animationType="none"
        onRequestClose={() => setResults(null)}
      >
        {/* Tap outside to close */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setResults(null)}
        >
          <View style={styles.suggestModalSheet}>
            <View style={styles.suggestModalHandle} />
            <Text style={styles.suggestModalTitle}>Select Location</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {results && results.slice(0, 8).map((s, i, arr) => (
                <TouchableOpacity
                  key={`${s.pincode}-${s.name}-${i}`}
                  testID={`${testIDPrefix}-suggest-${i}`}
                  style={[styles.suggestRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => pick(s)}
                  activeOpacity={0.7}
                >
                  <View style={styles.flex1}>
                    <Text style={styles.suggestName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.suggestSub} numberOfLines={2}>{s.city}</Text>
                  </View>
                  <Text style={styles.suggestPin}>{s.pincode}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <VoiceListenOverlay visible={listening} onCancel={stopVoice} status={voiceStatus} />
    </View>
  );

// ============== SmartLocationInput (FindSpaceModal - uses Mappls /places endpoint) ==============
function SmartLocationInput({ label, testIDPrefix, value, onResolve, error, onError }: {
  label: string; testIDPrefix: string; value: string;
  onResolve: (pincode: string) => void; error: string; onError: (e: string) => void;
}) {
  const [text, setText] = useState(value);
  const [suggestions, setSuggestions] = useState<MapplsSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<any>(null);
  const isPincodeMode = text.length === 0 || /^\d/.test(text);

  useEffect(() => { setText(value); }, [value]);

  const handleChange = (t: string) => {
    onError("");
    if (/^\d/.test(t) || t.length === 0) {
      const cleaned = t.replace(/\D/g, "").slice(0, 6);
      setText(cleaned);
      setSuggestions([]);
      if (cleaned.length === 6) onResolve(cleaned);
    } else {
      setText(t);
      clearTimeout(timerRef.current);
      if (t.trim().length < 3) { setSuggestions([]); return; }
      timerRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await fetch(`${API}/places?query=${encodeURIComponent(t.trim())}`);
          const data = await res.json();
          setSuggestions((data.suggestedLocations || []).slice(0, 6));
        } catch { setSuggestions([]); }
        finally { setSearching(false); }
      }, 350);
    }
  };

  const pickSuggestion = (s: MapplsSuggestion) => {
    const pincode = extractPincode(s.placeAddress);
    setText(s.placeName);
    setSuggestions([]);
    if (pincode) {
      onResolve(pincode);
    } else {
      onError(`No pincode found for "${s.placeName}". Try a more specific address or enter pincode directly.`);
    }
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={`${testIDPrefix}-input`}
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="Pincode (e.g. 400069) or address"
        placeholderTextColor={COLORS.textSubtle}
        value={text}
        onChangeText={handleChange}
        keyboardType={isPincodeMode ? "number-pad" : "default"}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={isPincodeMode ? 6 : 80}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {searching ? <Text style={styles.hintMuted}>Searching…</Text> : null}
      {suggestions.length > 0 ? (
        <View style={styles.suggestList} testID={`${testIDPrefix}-suggest-list`}>
          {suggestions.map((s, i) => {
            const pincode = extractPincode(s.placeAddress);
            return (
              <TouchableOpacity key={`${s.eLoc}-${i}`} testID={`${testIDPrefix}-suggest-${i}`} style={[styles.suggestRow, i === suggestions.length - 1 && { borderBottomWidth: 0 }]} onPress={() => pickSuggestion(s)} activeOpacity={0.7}>
                <View style={styles.flex1}>
                  <Text style={styles.suggestName} numberOfLines={1}>{s.placeName}</Text>
                  <Text style={styles.suggestSub} numberOfLines={1}>{s.placeAddress}</Text>
                </View>
                {pincode ? <Text style={styles.suggestPin}>{pincode}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// ============== Load Market ==============
const geoCache = new Map<string, { lat: number; lon: number; found: boolean }>();

async function geocodePin(pin: string) {
  if (geoCache.has(pin)) return geoCache.get(pin)!;
  try {
    const r = await fetch(`${API}/geocode/${pin}`);
    const j = await r.json();
    const out = { lat: j.lat || 0, lon: j.lon || 0, found: !!j.found };
    if (out.found) geoCache.set(pin, out);
    return out;
  } catch { return { lat: 0, lon: 0, found: false }; }
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function bearingRad(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat), dLon = toRad(b.lon - a.lon);
  return Math.atan2(Math.sin(dLon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon));
}

function trackDistancesKm(start: { lat: number; lon: number }, end: { lat: number; lon: number }, p: { lat: number; lon: number }) {
  const R = 6371;
  const d13 = haversineKm(start, p) / R, t13 = bearingRad(start, p), t12 = bearingRad(start, end);
  const xt = Math.asin(Math.sin(d13) * Math.sin(t13 - t12)) * R;
  const at = Math.acos(Math.cos(d13) / Math.cos(xt / R)) * R;
  return { cross: Math.abs(xt), along: at };
}

type ActiveFilter = { origin: string; dest: string; weightKg: number; volumeCuft: number | null; originCoord: { lat: number; lon: number }; destCoord: { lat: number; lon: number } };
type Distances = Record<string, { origin: number; dest: number; offRoute: boolean }>;

function LoadMarketScreen({ profile }: { profile: Profile }) {
  const [allLoads, setAllLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [filteredLoads, setFilteredLoads] = useState<Load[] | null>(null);
  const [distances, setDistances] = useState<Distances>({});

  const fetchLoads = useCallback(async () => {
    try { const r = await fetch(`${API}/loads`); const j = await r.json(); setAllLoads(j); }
    catch { Alert.alert("Error", "Failed to fetch loads"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  const applyFilter = useCallback(async (f: ActiveFilter) => {
    const dist: Distances = {};
    const survivors: { load: Load; total: number }[] = [];
    for (const load of allLoads) {
      if (load.weight_tons * 1000 < f.weightKg) continue;
      if (f.volumeCuft != null && load.space_cuft != null && load.space_cuft < f.volumeCuft) continue;
      const lo = await geocodePin(load.origin_pincode); if (!lo.found) continue;
      const ld = await geocodePin(load.destination_pincode); if (!ld.found) continue;
      const dOrigin = haversineKm(f.originCoord, lo), dDest = haversineKm(f.destCoord, ld);
      if (dOrigin <= 30 && dDest <= 30) { dist[load.id] = { origin: dOrigin, dest: dDest, offRoute: false }; survivors.push({ load, total: dOrigin + dDest }); continue; }
      const routeLen = haversineKm(lo, ld);
      if (routeLen > 400) {
        const oTrack = trackDistancesKm(lo, ld, f.originCoord), dTrack = trackDistancesKm(lo, ld, f.destCoord);
        const inSegment = (at: number) => at >= 0 && at <= routeLen;
        if (oTrack.cross <= 30 && dTrack.cross <= 30 && inSegment(oTrack.along) && inSegment(dTrack.along) && oTrack.along <= dTrack.along) {
          dist[load.id] = { origin: oTrack.cross, dest: dTrack.cross, offRoute: true };
          survivors.push({ load, total: oTrack.cross + dTrack.cross });
        }
      }
    }
    survivors.sort((a, b) => a.total - b.total);
    setFilteredLoads(survivors.map((s) => s.load));
    setDistances(dist);
  }, [allLoads]);

  const onApplyFilter = async (f: ActiveFilter) => { setActiveFilter(f); setShowFilter(false); await applyFilter(f); };
  const onClearFilter = () => { setActiveFilter(null); setFilteredLoads(null); setDistances({}); };
  const isFiltered = activeFilter !== null;
  const displayLoads = isFiltered ? filteredLoads || [] : allLoads;

  return (
    <View style={styles.fill}>
      <View style={styles.marketTop}>
        <Text style={styles.marketCount} testID="loads-count">{displayLoads.length} {displayLoads.length === 1 ? "truck" : "trucks"} {isFiltered ? "matched" : "available"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isFiltered && (
            <TouchableOpacity testID="clear-filter-btn" onPress={onClearFilter} style={styles.clearChip}>
              <Ionicons name="close" size={14} color={COLORS.textMuted} />
              <Text style={styles.clearChipText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity testID="find-space-btn" style={[styles.filterBtn, isFiltered && styles.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <Ionicons name="search" size={16} color={isFiltered ? COLORS.surface : COLORS.primary} />
            <Text style={[styles.filterBtnText, isFiltered && { color: COLORS.surface }]}>Find Space</Text>
            {isFiltered && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <View style={[styles.fill, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          testID="loads-list"
          data={displayLoads}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoads(); }} />}
          ListFooterComponent={isFiltered && displayLoads.length > 0 ? <Text style={styles.approxNote}>* Distances are approximate (straight-line)</Text> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap} testID="empty-state">
              <Ionicons name={isFiltered ? "search" : "cube-outline"} size={48} color={COLORS.textSubtle} />
              <Text style={styles.emptyTitle}>{isFiltered ? "No matching trucks found" : "No loads yet"}</Text>
              <Text style={styles.emptySub}>{isFiltered ? "Try adjusting your cargo details or search within a wider area." : "Be the first to post a load!"}</Text>
            </View>
          }
          renderItem={({ item }) => <LoadCard load={item} isMine={item.poster_phone === profile.phone} distance={isFiltered ? distances[item.id] : undefined} />}
        />
      )}
      <FindSpaceModal visible={showFilter} initial={activeFilter} onClose={() => setShowFilter(false)} onApply={onApplyFilter} />
    </View>
  );
}

function LoadCard({ load, isMine, distance }: { load: Load; isMine: boolean; distance?: { origin: number; dest: number; offRoute: boolean } }) {
  const [showImages, setShowImages] = useState(false);
  const callPoster = () => Linking.openURL(`tel:${load.poster_phone}`).catch(() => Alert.alert("Error", "Cannot open dialer"));
  const dateStr = useMemo(() => { try { return new Date(load.loading_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return load.loading_date; } }, [load.loading_date]);

  return (
    <View style={styles.card} testID={`load-card-${load.id}`}>
      <View style={styles.cardRouteRow}>
        <View style={styles.flex1}>
          <Text style={styles.routePin}>{load.origin_pincode}</Text>
          <Text style={styles.routeCity} numberOfLines={1}>{load.origin_city || "—"}</Text>
          <Text style={styles.routeState} numberOfLines={1}>{load.origin_state}</Text>
        </View>
        <View style={styles.routeArrow}><Ionicons name="arrow-forward" size={20} color={COLORS.secondary} /><View style={styles.routeLine} /></View>
        <View style={[styles.flex1, { alignItems: "flex-end" }]}>
          <Text style={styles.routePin}>{load.destination_pincode}</Text>
          <Text style={styles.routeCity} numberOfLines={1}>{load.destination_city || "—"}</Text>
          <Text style={styles.routeState} numberOfLines={1}>{load.destination_state}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.specsRow}>
        <Spec icon="barbell-outline" label="Weight" value={`${load.weight_tons} T`} />
        <Spec icon="cube-outline" label="Space" value={load.space_cuft != null ? `${load.space_cuft} ft³` : "—"} />
        <Spec icon="calendar-outline" label="Loading" value={dateStr} />
      </View>
      {distance ? (
        <View style={styles.distanceRow} testID={`distance-${load.id}`}>
          <View style={styles.distanceChip}><Ionicons name="location-outline" size={12} color={COLORS.success} /><Text style={styles.distanceText}>Origin: {distance.origin.toFixed(1)} km {distance.offRoute ? "off-route" : "away"}</Text></View>
          <View style={styles.distanceChip}><Ionicons name="flag-outline" size={12} color={COLORS.success} /><Text style={styles.distanceText}>Destination: {distance.dest.toFixed(1)} km {distance.offRoute ? "off-route" : "away"}</Text></View>
        </View>
      ) : null}
      <View style={styles.cargoChipsRow}>
        {load.truck_type ? (
          <View style={[styles.miniChip, styles.truckChip]}>
            {(() => { const img = TRUCK_TYPES.find((t) => t.name === load.truck_type)?.image; return img ? <Image source={img} style={{ width: 22, height: 12, marginRight: 4 }} tintColor={COLORS.surface} resizeMode="contain" /> : null; })()}
            <Text style={[styles.miniChipText, { color: COLORS.surface }]}>{load.truck_type}</Text>
          </View>
        ) : null}
        {load.cargo_placement ? <View style={[styles.miniChip, { backgroundColor: "#FFF4EE" }]}><Text style={[styles.miniChipText, { color: COLORS.secondary }]}>{load.cargo_placement}</Text></View> : null}
      </View>
      {load.images && load.images.length > 0 ? (
        <View style={styles.cardPhotosRow} testID={`card-photos-${load.id}`}>
          {load.images.slice(0, 3).map((src, i) => <Image key={i} source={{ uri: src }} style={styles.cardPhoto} resizeMode="cover" />)}
        </View>
      ) : (load.image_count || 0) > 0 ? (
        showImages ? (
          <View style={styles.cardPhotosRow} testID={`card-photos-${load.id}`}>
            {Array.from({ length: load.image_count || 0 }).slice(0, 3).map((_, i) => (
              <Image key={i} source={{ uri: `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/loads/${load.id}/image/${i}` }} style={styles.cardPhoto} resizeMode="cover" />
            ))}
          </View>
        ) : (
          <TouchableOpacity testID={`show-images-btn-${load.id}`} onPress={() => setShowImages(true)} style={styles.showImagesBtn}>
            <Ionicons name="images-outline" size={16} color={COLORS.primary} />
            <Text style={styles.showImagesBtnText}>Show {load.image_count} {load.image_count === 1 ? "photo" : "photos"}</Text>
          </TouchableOpacity>
        )
      ) : null}
      <View style={styles.divider} />
      <View style={styles.posterRow}>
        <View style={styles.flex1}>
          <Text style={styles.posterName}>{load.poster_name}{isMine && <Text style={styles.youTag}>  • You</Text>}</Text>
          {load.poster_company ? <Text style={styles.posterCompany}>{load.poster_company}</Text> : null}
          <Text style={styles.posterPhone}>+91 {load.poster_phone}</Text>
        </View>
        {!isMine && (
          <TouchableOpacity testID={`call-btn-${load.id}`} style={styles.callBtn} onPress={callPoster}>
            <Ionicons name="call" size={16} color={COLORS.surface} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Spec({ icon, label, value }: any) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={14} color={COLORS.textMuted} />
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

// ============== FindSpaceModal with Mappls Autosuggest ==============
function FindSpaceModal({ visible, initial, onClose, onApply }: {
  visible: boolean; initial: ActiveFilter | null; onClose: () => void; onApply: (f: ActiveFilter) => Promise<void>;
}) {
  const [originPin, setOriginPin] = useState("");
  const [destPin, setDestPin] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [volumeCuft, setVolumeCuft] = useState("");
  const [originErr, setOriginErr] = useState("");
  const [destErr, setDestErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setOriginPin(initial?.origin || ""); setDestPin(initial?.dest || "");
      setWeightKg(initial?.weightKg ? String(initial.weightKg) : "");
      setVolumeCuft(initial?.volumeCuft ? String(initial.volumeCuft) : "");
      setOriginErr(""); setDestErr("");
    }
  }, [visible, initial]);

  const submit = async () => {
    setOriginErr(""); setDestErr("");
    if (!/^\d{6}$/.test(originPin)) { setOriginErr("Please select a valid origin from the list or enter a 6-digit pincode"); return; }
    if (!/^\d{6}$/.test(destPin)) { setDestErr("Please select a valid destination from the list or enter a 6-digit pincode"); return; }
    const w = parseFloat(weightKg);
    const v = volumeCuft.trim() === "" ? null : parseFloat(volumeCuft);
    if (!w || w <= 0) return Alert.alert("Required", "Enter cargo weight in kg");
    if (v !== null && (isNaN(v) || v <= 0)) return Alert.alert("Invalid", "Enter valid volume in cu ft (or leave it blank)");
    setBusy(true);
    try {
      const [oc, dc] = await Promise.all([geocodePin(originPin), geocodePin(destPin)]);
      if (!oc.found) { setOriginErr("Pincode not found, please check and try again."); return; }
      if (!dc.found) { setDestErr("Pincode not found, please check and try again."); return; }
      await onApply({ origin: originPin, dest: destPin, weightKg: w, volumeCuft: v, originCoord: { lat: oc.lat, lon: oc.lon }, destCoord: { lat: dc.lat, lon: dc.lon } });
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
        <View style={styles.modalSheet} testID="find-space-modal">
          <View style={styles.modalHandle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Find Space</Text>
            <Text style={styles.modalSubtitle}>Enter your cargo details to find matching trucks within 30 km of your route.</Text>

            <SmartLocationInput
              label="My Origin — Pincode or Address"
              testIDPrefix="fs-origin"
              value={originPin}
              onResolve={(pin) => { setOriginPin(pin); setOriginErr(""); }}
              error={originErr}
              onError={setOriginErr}
            />

            <SmartLocationInput
              label="My Destination — Pincode or Address"
              testIDPrefix="fs-dest"
              value={destPin}
              onResolve={(pin) => { setDestPin(pin); setDestErr(""); }}
              error={destErr}
              onError={setDestErr}
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Field label="Weight (kg)">
                  <TextInput testID="fs-weight-input" style={styles.input} placeholder="e.g., 800" placeholderTextColor={COLORS.textSubtle} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
                </Field>
              </View>
              <View style={{ width: 12 }} />
              <View style={styles.flex1}>
                <Field label="Volume (cu ft) — optional">
                  <TextInput testID="fs-volume-input" style={styles.input} placeholder="Optional" placeholderTextColor={COLORS.textSubtle} value={volumeCuft} onChangeText={setVolumeCuft} keyboardType="decimal-pad" />
                </Field>
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity testID="fs-cancel-btn" style={[styles.outlineBtn, styles.flex1]} onPress={onClose} disabled={busy}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity testID="fs-apply-btn" style={[styles.primaryBtn, styles.flex1, { marginTop: 0 }]} onPress={submit} disabled={busy}>
                {busy ? <ActivityIndicator color={COLORS.surface} /> : <Text style={styles.primaryBtnText}>Show Matching Trucks</Text>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============== Helpers ==============
function Field({ label, children }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ============== Styles ==============
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: "center", justifyContent: "center" },
  flex1: { flex: 1 },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  iconBtn: { padding: 4 },
  tabs: { flexDirection: "row", backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.bg, gap: 6 },
  tabBtnActive: { backgroundColor: "#E8EDF7" },
  tabText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: COLORS.primary },
  profileWrap: { padding: 24, paddingTop: 60 },
  profileLogo: { width: 72, height: 72, backgroundColor: COLORS.primary, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  profileTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text },
  profileSubtitle: { fontSize: 15, color: COLORS.textMuted, marginTop: 6, lineHeight: 22 },
  formWrap: { padding: 16, paddingBottom: 40 },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, marginBottom: 8 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, minHeight: 64, paddingVertical: 18 },
  hintMuted: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  hintOk: { fontSize: 12, color: COLORS.success, marginTop: 6, fontWeight: "600" },
  inputWithIconWrap: { position: "relative", justifyContent: "center" },
  micBtnAbs: { position: "absolute", right: 6, top: 6, bottom: 6, width: 38, borderRadius: 100, backgroundColor: "#EEF2FA", alignItems: "center", justifyContent: "center" },
  voiceBackdrop: { flex: 1, backgroundColor: "rgba(10,36,99,0.55)", alignItems: "center", justifyContent: "center", padding: 32 },
  voiceCard: { backgroundColor: COLORS.surface, borderRadius: 24, paddingVertical: 36, paddingHorizontal: 28, alignItems: "center", width: "100%", maxWidth: 340 },
  voicePulseWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  voiceRing: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary },
  voiceMicBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  voiceTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  voiceSub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginBottom: 24, lineHeight: 18 },
  voiceCancelBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 100, borderWidth: 1.5, borderColor: COLORS.border },
  voiceCancelText: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  voiceInlineStatus: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  voiceInlineText: { fontSize: 12, color: COLORS.primary, fontWeight: "600", fontStyle: "italic" },
 suggestList: {
  position: "absolute",
  top: 78,
  left: -170,
  right: -170,
  zIndex: 999,
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 14,
  overflow: "hidden",
  elevation: 12,
},
  suggestRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  suggestName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  suggestSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  suggestPin: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  suggestMore: { fontSize: 11, color: COLORS.textSubtle, paddingVertical: 8, paddingHorizontal: 14, fontStyle: "italic", textAlign: "center" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  segment: { flexDirection: "row", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  segmentBtnOn: { backgroundColor: COLORS.primary },
  segmentText: { color: COLORS.textMuted, fontWeight: "600" },
  segmentTextOn: { color: COLORS.surface },
 
  
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  primaryBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: "700" },
  whatsappBtn: { backgroundColor: "#25D366", paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  outlineBtn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  outlineBtnText: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  marketTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  marketCount: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600" },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1.5, borderColor: COLORS.primary },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBtnText: { color: COLORS.primary, fontWeight: "600", fontSize: 13 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardRouteRow: { flexDirection: "row", alignItems: "center" },
  routePin: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  routeCity: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontWeight: "600" },
  routeState: { fontSize: 11, color: COLORS.textSubtle, marginTop: 1 },
  routeArrow: { width: 60, alignItems: "center", paddingHorizontal: 8 },
  routeLine: { position: "absolute", top: 9, left: 4, right: 4, height: 1, backgroundColor: COLORS.border, zIndex: -1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  specsRow: { flexDirection: "row", justifyContent: "space-between" },
  specItem: { flex: 1, alignItems: "flex-start", gap: 2 },
  specLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  specValue: { fontSize: 14, color: COLORS.text, fontWeight: "700" },
  cargoChipsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  photoRow: { flexDirection: "row", marginHorizontal: -4 },
  photoCell: { flex: 1, aspectRatio: 1, marginHorizontal: 4, borderRadius: 12, overflow: "hidden", backgroundColor: COLORS.surface, position: "relative" },
  photoEmpty: { borderWidth: 1.5, borderColor: COLORS.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoImg: { width: "100%", height: "100%" },
  photoRemoveBtn: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  photoAddLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },
  cardPhotosRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  cardPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: COLORS.bg },
  showImagesBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  showImagesBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  miniChip: { backgroundColor: "#EEF2FA", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100, marginRight: 6, marginBottom: 6, flexDirection: "row", alignItems: "center" },
  miniChipText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
  truckChip: { backgroundColor: COLORS.primary, paddingHorizontal: 10 },
  truckRow: { flexDirection: "row", marginHorizontal: -4 },
  truckCard: { flex: 1, marginHorizontal: 4, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center" },
  truckCardOn: { borderColor: COLORS.primary, backgroundColor: "#F0F4FB" },
  truckImg: { width: 88, height: 50 },
  truckImgOn: {},
  truckLabel: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted, textAlign: "center", marginTop: 8 },
  truckLabelOn: { color: COLORS.primary, fontWeight: "700" },
  posterRow: { flexDirection: "row", alignItems: "center" },
  posterName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  posterCompany: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  posterPhone: { fontSize: 12, color: COLORS.textSubtle, marginTop: 2 },
  youTag: { color: COLORS.secondary, fontWeight: "600", fontSize: 12 },
  callBtn: { backgroundColor: COLORS.success, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 100, flexDirection: "row", alignItems: "center", gap: 6 },
  callBtnText: { color: COLORS.surface, fontWeight: "700", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: COLORS.textMuted, marginTop: 6, textAlign: "center" },
  profileCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  avatarBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarBigText: { fontSize: 30, fontWeight: "700", color: COLORS.surface, letterSpacing: 1 },
  profileCardName: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  profileCardCompany: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, fontWeight: "600" },
  profilePhoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  profileCardPhone: { fontSize: 14, color: COLORS.textMuted, fontWeight: "500" },
  statsRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginTop: 16, paddingVertical: 16 },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 24, marginBottom: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, maxHeight: "92%" },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 18 },
  inputError: { borderColor: COLORS.danger },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 6, fontWeight: "500" },
  filterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary, marginLeft: 6 },
  clearChip: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 100, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  clearChipText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 12 },
  distanceRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  distanceChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5EA", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 100, gap: 4 },
  distanceText: { fontSize: 11, color: COLORS.success, fontWeight: "700" },
  approxNote: { fontSize: 11, color: COLORS.textSubtle, textAlign: "center", marginTop: 12, fontStyle: "italic" },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 100, paddingVertical: 10, paddingHorizontal: 16, marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  chipTextOn: { color: COLORS.surface },
	
placementRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
placementCard: {
  flex: 1,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: COLORS.surface,
  borderWidth: 1.5,
  borderColor: COLORS.border,
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 8,
  marginHorizontal: 5,
},

	
placementCardGreen: { borderColor: "#1B5E20", backgroundColor: "#F1F8F1" },
placementCardRed: { borderColor: "#C62828", backgroundColor: "#FDF1F1" },
placementImg: {
  width: 72,
  height: 72,
  marginBottom: 10,
},
placementLabel: {
  fontSize: 14,
  fontWeight: "700",
  color: COLORS.text,
},
	
placementLabelGreen: { color: "#1B5E20" },
placementLabelRed: { color: "#C62828" },



routeInputBox: {
  flex: 1,
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 12,
  padding: 12,
  minHeight: 160,
  minWidth: 150,	
},
routeBoxLabel: {
  fontSize: 11,
  fontWeight: "700",
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
},
routeArrowMid: {
  paddingHorizontal: 4,
  paddingTop: 80,
},
stepperRow: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 12,
  padding: 10,
  marginBottom: 14,
  gap: 12,
},
stepperBtn: {
  width: 36,
  height: 36,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: COLORS.bg,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},
stepperBtnText: {
  fontSize: 22,
  color: COLORS.text,
  lineHeight: 26,
},
stepperCenter: {
  flex: 1,
  flexDirection: "row",
  alignItems: "baseline",
  justifyContent: "center",
  gap: 6,
},
stepperValue: {
  fontSize: 22,
  fontWeight: "700",
  color: COLORS.text,
},
stepperUnit: {
  fontSize: 13,
  color: COLORS.textMuted,
},
stepperDateText: {
  fontSize: 15,
  fontWeight: "600",
  color: COLORS.text,
  marginLeft: 6,
},
	
	routeInputsRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 8,
},





selectedRouteCard: {
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.primary,
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 14,
  paddingRight: 80,
  minHeight: 80,
  justifyContent: "center",
},
selectedRoutePin: {
  fontSize: 16,
  fontWeight: "700",
  color: COLORS.text,
},
selectedRouteCity: {
  marginTop: 4,
  fontSize: 12,
  color: COLORS.textMuted,
  lineHeight: 16,
},
changeRouteBtn: {
  position: "absolute",
  right: 46,
  top: 20,
  flexDirection: "row",
  alignItems: "center",
},

changeRouteText: {
  marginLeft: 4,
  color: COLORS.primary,
  fontSize: 12,
  fontWeight: "600",
},

  suggestModalSheet: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: COLORS.surface,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingHorizontal: 16,
  paddingBottom: 40,
  maxHeight: "70%",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: -4 },
  elevation: 12,
},
suggestModalHandle: {
  width: 40,
  height: 4,
  backgroundColor: COLORS.border,
  borderRadius: 2,
  alignSelf: "center",
  marginVertical: 12,
},
suggestModalTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 8,
},

});
