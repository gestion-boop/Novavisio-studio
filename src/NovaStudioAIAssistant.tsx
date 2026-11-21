import React, {useState, useMemo} from 'react';
import './novaStudioAI.css';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Calendar,
  Layers,
  Check,
  Download,
  Wand2,
  FolderDown,
  Play,
  Eye
} from 'lucide-react';
import {
  ACTIVITY_CATEGORIES,
  VISIT_TYPES,
  type ActivityCategory,
  type VisitType,
  type DetectedInfo,
  analyzeWebsite,
  analyzeLogoColors,
  buildInitialBrandKit,
  inferCategory
} from './novaStudioAI';
import {
  STYLES,
  BRAND_COLOR_LABELS,
  generateBrand,
  checkContrast,
  contrastRatio,
  readableOn,
  isHex,
  type BrandColors,
  type BrandKit,
  type StyleId
} from './brandKit';
import {
  BRAND_ICON_SET,
  type BrandIconSpec
} from './brandIconSet';
import {iconSvg, svgToPng, type IconShape, type IconState, ICON_SHAPES, ICON_STATES} from './brandIcons';
import {glossyIconStates} from './glossyIcon';

const ICON_STATE_OPTIONS: {id: IconState; label: string}[] = [
  {id: 'normal', label: 'Normal'},
  {id: 'hover', label: 'Survol ✨'},
  {id: 'pressed', label: 'Pressé'}
];
import {
  STUDIO_LANGUAGES,
  type StudioLanguage,
  type ClientProfile,
  type StudioProject,
  type CustomIcon,
  type ImportedButtonSet,
  type BottomBarItem,
  readImage
} from './storage';
import {
  INTRO_STYLES,
  INTRO_ANIMATIONS,
  INTRO_LOGO_SHAPES,
  type IntroDesign,
  type IntroStyleId,
  type IntroAnimation,
  type IntroLogoShape,
  introWelcomeColor
} from './introDesign';
import {
  generateAutoIntroPreset,
  generateAutoMenuProposals,
  buildBarStyle,
  AUTO_BAR_LAYOUTS,
  type AutoBarLayout,
  type AutoButtonItem
} from './autoMenu';
import { NativeIntro } from './nativeIntro';

export type NovaStudioAIProps = {
  project: StudioProject;
  defaultMode?: 'new' | 'update';
  /** Nouveau client : les champs démarrent vides au lieu de reprendre la visite en cours. */
  freshClient?: boolean;
  onApply: (
    updated: Partial<StudioProject>,
    clientProfile: ClientProfile,
    brandKit: BrandKit,
    mode: 'new' | 'update'
  ) => void;
  onClose: () => void;
};


/** États (normal, survol, pressé) d'une icône de charte : brillant (glossy) ou plat, selon le choix du client. */
export type GlossyColors = {background: string; pictogram: string; outline: string};
async function iconStatesFor(spec: {label: string; nodes: ReadonlyArray<readonly [string, Record<string, string | number>]>}, colors: BrandColors, shape: IconShape, finish: 'plat' | 'glossy', glossy: GlossyColors) {
  if (finish === 'glossy') {
    const body = spec.nodes.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
    const glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24"><g fill="none" stroke="${glossy.pictogram}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(12 12) scale(0.56) translate(-12 -12)">${body}</g></svg>`;
    const glyph = await svgToPng(glyphSvg, 256);
    return glossyIconStates({base: glossy.background, rim: glossy.outline, glyph, size: 256, format: 'png'});
  }
  const [normal, hover, pressed] = await Promise.all((['normal', 'hover', 'pressed'] as const).map(st => svgToPng(iconSvg(spec as never, colors, shape, st as IconState), 256)));
  return {normal, hover, pressed};
}

export function NovaStudioAIAssistant({project, defaultMode = 'new', freshClient = false, onApply, onClose}: NovaStudioAIProps) {
  const seed: Partial<StudioProject> = freshClient ? {} : project;
  const [activeTab, setActiveTab] = useState<'info' | 'brand' | 'icons' | 'intro' | 'menu'>('info');
  const [creationMode, setCreationMode] = useState<'new' | 'update'>(defaultMode);

  // ==========================================
  // Champs Module 1 — Création et analyse
  // ==========================================
  const [clientName, setClientName] = useState(seed.clientProfile?.name || seed.name || '');
  const [projectName, setProjectName] = useState(seed.name || '');
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>(
    (seed.clientProfile?.activityCategory as ActivityCategory) || 'autre'
  );
  const [website, setWebsite] = useState(seed.clientProfile?.website || '');
  const [address, setAddress] = useState(seed.clientProfile?.address || '');
  const [city, setCity] = useState(seed.clientProfile?.city || '');
  const [phone, setPhone] = useState(seed.clientProfile?.phone || '');
  const [email, setEmail] = useState(seed.clientProfile?.email || '');
  const [bookingUrl, setBookingUrl] = useState(seed.clientProfile?.bookingUrl || '');
  const [facebook, setFacebook] = useState(seed.clientProfile?.facebook || '');
  const [instagram, setInstagram] = useState(seed.clientProfile?.instagram || '');
  const [visitType, setVisitType] = useState<VisitType>(
    (seed.clientProfile?.visitType as VisitType) || (seed.vrEnabled ? 'hybrid' : 'premium')
  );
  const [selectedLanguages, setSelectedLanguages] = useState<StudioLanguage[]>(
    project.languages && project.languages.length ? project.languages : ['fr', 'en']
  );
  const [logoUrl, setLogoUrl] = useState<string>(seed.clientProfile?.logoUrl || '');
  const [logoColors, setLogoColors] = useState<{primary: string; accent: string} | null>(null);

  // Données détectées
  const [analyzing, setAnalyzing] = useState(false);
  const [detected, setDetected] = useState<DetectedInfo | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // ==========================================
  // Module 2 — Charte graphique
  // ==========================================
  const [styleId, setStyleId] = useState<StyleId>(
    (project.brandKit?.styleId as StyleId) || 'moderne'
  );
  const [seedColor, setSeedColor] = useState<string>(
    project.brandKit?.seed && isHex(project.brandKit.seed) ? project.brandKit.seed : '#2f8fb5'
  );
  const [colors, setColors] = useState<BrandColors>(
    project.brandKit?.colors || generateBrand('#2f8fb5', 'moderne')
  );

  // ==========================================
  // Module 3 — Icônes et Boutons (Phase 2)
  // ==========================================
  const [iconShape, setIconShape] = useState<IconShape>('circle');
  const [iconFinish, setIconFinish] = useState<'plat' | 'glossy'>('plat');
  const [glossyColors, setGlossyColors] = useState<GlossyColors>({background: '#224A95', pictogram: '#ffffff', outline: '#15336B'});
  const [iconResolution, setIconResolution] = useState<256 | 512 | 1024>(512);
  const [previewState, setPreviewState] = useState<IconState>('normal');
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customIcons, setCustomIcons] = useState<BrandIconSpec[]>([]);
  const [packBusy, setPackBusy] = useState('');
  const [packMessage, setPackMessage] = useState('');
  const [appliedPack, setAppliedPack] = useState(false);

  // ==========================================
  // Module 5 — Introduction automatique (Phase 3)
  // ==========================================
  const initialIntroPreset = useMemo(
    () => generateAutoIntroPreset({
      category: activityCategory,
      clientName: clientName || project.name || 'Visite 360°',
      colors,
      logoUrl: logoUrl || undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [introEnabled, setIntroEnabled] = useState<boolean>(
    project.introDesign?.enabled ?? project.introEnabled ?? true
  );
  const [introStyleId, setIntroStyleId] = useState<IntroStyleId>(
    project.introDesign?.styleId || initialIntroPreset.styleId
  );
  const [introAnimation, setIntroAnimation] = useState<IntroAnimation>(
    project.introDesign?.animation || initialIntroPreset.animation
  );
  const [introTitle, setIntroTitle] = useState<string>(
    project.introDesign?.title || clientName || project.name || ''
  );
  const [introSubtitle, setIntroSubtitle] = useState<string>(
    project.introDesign?.subtitle || initialIntroPreset.subtitle
  );
  const [introButtonLabel, setIntroButtonLabel] = useState<string>(
    project.introDesign?.buttonLabel || initialIntroPreset.buttonLabel
  );
  const [introDuration, setIntroDuration] = useState<number>(
    project.introDuration ?? 6
  );
  const [introLogoShape, setIntroLogoShape] = useState<IntroLogoShape>(
    project.introDesign?.logoShape || 'original'
  );
  const [previewIntroActive, setPreviewIntroActive] = useState(false);

  // ==========================================
  // Module 7 — Interface & Menus automatiques (Phase 3)
  // ==========================================
  const [barLayout, setBarLayout] = useState<AutoBarLayout>('discrete');
  const [menuCustomTitles, setMenuCustomTitles] = useState<Record<string, string>>({});

  const menuProposals: AutoButtonItem[] = useMemo(() => {
    return generateAutoMenuProposals({
      category: activityCategory,
      clientName: clientName || project.name || 'Établissement',
      bookingUrl: bookingUrl || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      address: address ? `${address}${city ? ', ' + city : ''}` : undefined,
      services: detected?.services,
      openingHours: detected?.openingHours,
      hasPhotos: (detected?.photoUrls?.length ?? 0) > 0 || (project.scenes?.length ?? 0) > 0,
    });
  }, [activityCategory, clientName, project.name, bookingUrl, phone, email, website, address, city, detected, project.scenes]);

  const [selectedMenuKeys, setSelectedMenuKeys] = useState<Set<string>>(() => {
    const initial = generateAutoMenuProposals({
      category: (project.clientProfile?.activityCategory as ActivityCategory) || 'autre',
      clientName: project.clientProfile?.name || project.name || '',
      bookingUrl: project.clientProfile?.bookingUrl,
      phone: project.clientProfile?.phone,
      email: project.clientProfile?.email,
      website: project.clientProfile?.website,
      address: project.clientProfile?.address,
    });
    return new Set(initial.filter((p) => p.recommended).map((p) => p.key));
  });

  const toggleMenuProposal = (key: string) => {
    setSelectedMenuKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Ratios et alertes WCAG
  const contrastIssues = useMemo(() => checkContrast(colors), [colors]);
  const hasContrastError = contrastIssues.some((i) => i.level === 'error');

  // Liste de toutes les icônes (les 36 standard + personnalisées)
  const allIconSpecs = useMemo(() => [...BRAND_ICON_SET, ...customIcons], [customIcons]);

  // Lancer l'analyse automatique du site web
  const runWebsiteAnalysis = async () => {
    if (!website.trim()) {
      setAnalysisError('Renseigne d’abord l’adresse du site internet.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const data = await analyzeWebsite(website.trim());
      setDetected(data);

      if (data.address && !address) setAddress(data.address);
      if (data.city && !city) setCity(data.city);
      if (data.phone && !phone) setPhone(data.phone);
      if (data.email && !email) setEmail(data.email);
      if (data.bookingUrl && !bookingUrl) setBookingUrl(data.bookingUrl);
      if (data.facebook && !facebook) setFacebook(data.facebook);
      if (data.instagram && !instagram) setInstagram(data.instagram);

      if (data.logoUrls.length > 0 && !logoUrl) {
        setLogoUrl(data.logoUrls[0]);
      }

      const suggestedCategory = inferCategory(clientName || '', data.notes?.join(' '), data.services);
      if (suggestedCategory !== 'autre' && activityCategory === 'autre') {
        setActivityCategory(suggestedCategory);
      }

      const initial = buildInitialBrandKit(
        activityCategory !== 'autre' ? activityCategory : suggestedCategory,
        data,
        logoColors,
        styleId
      );
      setSeedColor(initial.seed);
      setColors(initial.kit.colors);

      // Met à jour les propositions d'introduction avec les données fraîches
      const freshIntro = generateAutoIntroPreset({
        category: activityCategory !== 'autre' ? activityCategory : suggestedCategory,
        clientName: clientName || project.name || 'Visite 360°',
        colors: initial.kit.colors,
        logoUrl: data.logoUrls[0] || logoUrl,
      });
      setIntroSubtitle(freshIntro.subtitle);
      setIntroButtonLabel(freshIntro.buttonLabel);
      setIntroStyleId(freshIntro.styleId);
      setIntroAnimation(freshIntro.animation);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  // Traiter l'import d'un logo par fichier
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImage(file);
      setLogoUrl(dataUrl);
      const extracted = await analyzeLogoColors(dataUrl);
      setLogoColors(extracted);
      setSeedColor(extracted.primary);
      setColors(generateBrand(extracted.primary, styleId));
    } catch (err) {
      setAnalysisError('Échec de la lecture du logo : ' + String(err));
    }
  };

  // Recalculer les couleurs en changeant de style prédéfini
  const handleStyleChange = (newStyle: StyleId) => {
    setStyleId(newStyle);
    setColors(generateBrand(seedColor, newStyle));
  };

  // Modification manuelle d'une couleur dans la palette
  const handleColorUpdate = (key: keyof BrandColors, val: string) => {
    setColors((prev) => ({...prev, [key]: val}));
  };

  // Basculer une langue
  const toggleLanguage = (lang: StudioLanguage) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length <= 1) return;
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  // Télécharger le pack complet ZIP avec toutes les icônes en HD PNG et SVG
  const downloadZip = async () => {
    setPackBusy(`Génération du pack ZIP (${iconResolution}px)…`);
    setPackMessage('');
    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new JSZip();

      const folderName = `novastudio-icons-${iconShape}-${iconResolution}px`;
      const rootFolder = zip.folder(folderName) || zip;
      const pngFolder = rootFolder.folder(`png-${iconResolution}px`);
      const svgFolder = rootFolder.folder('svg-vectoriel');

      let totalFiles = 0;
      for (const spec of allIconSpecs) {
        for (const state of ICON_STATES) {
          const svgCode = iconSvg(spec, colors, iconShape, state);
          const baseName = `${spec.key}_${state}`;

          svgFolder?.file(`${baseName}.svg`, svgCode);

          const pngDataUrl = await svgToPng(svgCode, iconResolution);
          const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
          pngFolder?.file(`${baseName}.png`, base64Data, {base64: true});

          totalFiles++;
        }
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {level: 6}
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setPackMessage(`✓ Archive ZIP téléchargée avec succès (${totalFiles} PNG HD + ${totalFiles} SVG vectoriels) !`);
    } catch (err) {
      setPackMessage('Échec du téléchargement ZIP : ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPackBusy('');
    }
  };

  // Génération d'une icône sur mesure par prompt textuel
  const generateCustomIcon = () => {
    const prompt = customPrompt.trim();
    if (!prompt) return;

    const key = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'custom-icon';
    if (allIconSpecs.some((s) => s.key === key)) {
      setPackMessage(`L’icône « ${prompt} » existe déjà dans la liste.`);
      return;
    }

    const lower = prompt.toLowerCase();
    let nodes: BrandIconSpec['nodes'] = [
      ['circle', {cx: 12, cy: 12, r: 4}],
      ['path', {d: 'M12 2v4m0 12v4M2 12h4m12 0h4'}]
    ];

    if (/borne|recharge|prise|electrique|charge|plug/i.test(lower)) {
      nodes = [
        ['path', {d: 'M12 22v-5'}],
        ['path', {d: 'M9 8V2'}],
        ['path', {d: 'M15 2v6'}],
        ['path', {d: 'M6 8h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6v-3a2 2 0 0 1 2-2z'}]
      ];
    } else if (/terrasse|vue|panoram|mer|horizon|plage/i.test(lower)) {
      nodes = [
        ['path', {d: 'm2 16 20 0'}],
        ['path', {d: 'm6 16-2 5'}],
        ['path', {d: 'm18 16 2 5'}],
        ['path', {d: 'M12 5a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7Z'}]
      ];
    } else if (/bar|cocktail|boisson|verre|aperitif/i.test(lower)) {
      nodes = [
        ['path', {d: 'm8 22 8 0'}],
        ['path', {d: 'm12 15 0 7'}],
        ['path', {d: 'm19 3-14 0 7 12 7-12z'}]
      ];
    } else if (/velo|cycl|bike/i.test(lower)) {
      nodes = [
        ['circle', {cx: 18.5, cy: 17.5, r: 3.5}],
        ['circle', {cx: 5.5, cy: 17.5, r: 3.5}],
        ['path', {d: 'M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5 3.5-7h3l2 3'}],
        ['path', {d: 'm5.5 17.5 4-7h5'}]
      ];
    } else if (/wifi|internet|connexion/i.test(lower)) {
      nodes = [
        ['path', {d: 'M2.5 9a15 15 0 0 1 19 0M5.8 12.5a10 10 0 0 1 12.4 0M9 16a5 5 0 0 1 6 0'}],
        ['circle', {cx: 12, cy: 19, r: 1}]
      ];
    }

    const newSpec: BrandIconSpec = {
      key,
      label: prompt.slice(0, 32),
      nodes
    };

    setCustomIcons((prev) => [...prev, newSpec]);
    setCustomPrompt('');
    setPackMessage(`✓ Icône personnalisée « ${prompt} » générée et ajoutée aux 3 états !`);
  };

  // Intégration directe des icônes dans le projet
  const integrateIconsIntoProject = async () => {
    setPackBusy('Génération des 3 états pour le projet…');
    setPackMessage('');
    try {
      const iconsToAdd: CustomIcon[] = [];
      const buttonSetsToAdd: ImportedButtonSet[] = [];

      for (const spec of allIconSpecs) {
        const {normal: normalData, hover: hoverData, pressed: pressedData} = await iconStatesFor(spec, colors, iconShape, iconFinish, glossyColors);

        const normalId = crypto.randomUUID();
        const hoverId = crypto.randomUUID();
        const pressedId = crypto.randomUUID();

        iconsToAdd.push(
          {id: normalId, name: `${spec.label} · Normal`, dataUrl: normalData},
          {id: hoverId, name: `${spec.label} · Survol`, dataUrl: hoverData},
          {id: pressedId, name: `${spec.label} · Pressé`, dataUrl: pressedData}
        );

        buttonSetsToAdd.push({
          id: crypto.randomUUID(),
          name: spec.label,
          iconId: normalId,
          hoverIconId: hoverId,
          pressedIconId: pressedId,
          iconSize: 48,
        });
      }

      setAppliedPack(true);
      setPackMessage(`✓ ${allIconSpecs.length} packs d'icônes intégrés (${iconsToAdd.length} fichiers Normal / Survol / Pressé) !`);
    } catch (err) {
      setPackMessage('Erreur d’intégration : ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPackBusy('');
    }
  };

  // Validation finale et application au projet (Phases 1, 2 et 3)
  const handleApply = async () => {
    if (!clientName.trim()) {
      setActiveTab('info');
      setAnalysisError('Le nom commercial du client est obligatoire.');
      return;
    }

    const brandKit: BrandKit = {
      styleId,
      colors,
      validated: true,
      seed: seedColor,
    };

    const clientProfile: ClientProfile = {
      novagenId: project.clientProfile?.novagenId || '',
      name: clientName.trim(),
      category: ACTIVITY_CATEGORIES.find((c) => c.id === activityCategory)?.label || activityCategory,
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      facebook: facebook.trim(),
      instagram: instagram.trim(),
      otherLinks: '',
      description: project.clientProfile?.description || '',
      bookingUrl: bookingUrl.trim() || undefined,
      openingHours: detected?.openingHours || project.clientProfile?.openingHours || undefined,
      services: detected?.services?.length ? detected.services.join(', ') : project.clientProfile?.services || undefined,
      logoUrl: logoUrl.trim() || undefined,
      photoUrls: detected?.photoUrls?.length ? detected.photoUrls.slice(0, 30) : project.clientProfile?.photoUrls || [],
      sourceNotes: detected?.notes?.length ? detected.notes : project.clientProfile?.sourceNotes || [],
      activityCategory,
      stylePreference: styleId,
      visitType,
    };

    // Préparation des icônes pour le projet
    const iconsToAdd: CustomIcon[] = [...project.icons];
    const buttonSetsToAdd: ImportedButtonSet[] = [...(project.buttonSets || [])];
    const iconIdMap: Record<string, {normal: string; hover: string; pressed: string}> = {};

    // Si le pack d'icônes est activé ou pour alimenter les boutons automatiques
    for (const spec of allIconSpecs) {
      const {normal: normalData, hover: hoverData, pressed: pressedData} = await iconStatesFor(spec, colors, iconShape, iconFinish, glossyColors);

      const normalId = crypto.randomUUID();
      const hoverId = crypto.randomUUID();
      const pressedId = crypto.randomUUID();

      iconIdMap[spec.key] = {
        normal: normalId,
        hover: hoverId,
        pressed: pressedId,
      };

      if (appliedPack) {
        iconsToAdd.push(
          {id: normalId, name: `${spec.label} · Normal`, dataUrl: normalData},
          {id: hoverId, name: `${spec.label} · Survol`, dataUrl: hoverData},
          {id: pressedId, name: `${spec.label} · Pressé`, dataUrl: pressedData}
        );

        buttonSetsToAdd.push({
          id: crypto.randomUUID(),
          name: spec.label,
          iconId: normalId,
          hoverIconId: hoverId,
          pressedIconId: pressedId,
          iconSize: 48,
        });
      }
    }

    // Construction de la barre du bas avec les boutons automatiques sélectionnés
    const selectedProposals = menuProposals.filter((p) => selectedMenuKeys.has(p.key));
    const newBottomBar: BottomBarItem[] = selectedProposals.map((proposal) => {
      const iconIds = iconIdMap[proposal.iconKey];
      return {
        id: crypto.randomUUID(),
        title: menuCustomTitles[proposal.key] || proposal.title,
        type: proposal.type,
        url: proposal.url || '',
        text: proposal.text || '',
        target: '',
        iconId: iconIds?.normal,
        hoverIconId: iconIds?.hover,
        pressedIconId: iconIds?.pressed,
        builtinIcon: proposal.iconKey,
        useCustomIcon: !!iconIds,
        iconSize: 48,
      };
    });

    // Configuration de l'introduction native (Module 5)
    const appliedIntro: IntroDesign = {
      enabled: introEnabled,
      styleId: introStyleId,
      animation: introAnimation,
      title: (introTitle.trim() || clientName.trim() || project.name).slice(0, 80),
      subtitle: introSubtitle.trim().slice(0, 160),
      buttonLabel: (introButtonLabel.trim() || 'Découvrir').slice(0, 30),
      backgroundColor: colors.background,
      buttonColor: colors.btnRest,
      welcomeColor: introWelcomeColor(colors.accent, colors.background),
      logoShape: introLogoShape,
      logoDataUrl: logoUrl || undefined,
    };

    // Configuration du style de la barre (Module 7)
    const appliedBarStyle = buildBarStyle(colors, barLayout, project.barStyle);

    const projectUpdate: Partial<StudioProject> = {
      name: projectName.trim() || clientName.trim(),
      clientProfile,
      brandKit,
      introDesign: appliedIntro,
      introEnabled: appliedIntro.enabled,
      introDuration,
      bottomBar: newBottomBar.length > 0 ? newBottomBar : project.bottomBar,
      barStyle: appliedBarStyle,
      languages: selectedLanguages,
      vrEnabled: visitType === 'vr' || visitType === 'hybrid',
      icons: iconsToAdd,
      buttonSets: buttonSetsToAdd,
    };

    onApply(projectUpdate, clientProfile, brandKit, creationMode);
    onClose();
  };

  return (
    <div className="nv-ai-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nv-ai-modal" role="dialog" aria-modal="true" aria-label="NovaStudio AI">
        {/* Entête */}
        <header className="nv-ai-header">
          <div className="nv-ai-title-wrap">
            <div className="nv-ai-badge">
              <Sparkles size={16} />
              <span>NovaStudio AI</span>
            </div>
            <h2>Création intelligente de visite immersive 360°</h2>
          </div>
          <button className="nv-ai-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {/* Onglets d'étapes (Phases 1, 2 et 3) */}
        <nav className="nv-ai-tabs" aria-label="Étapes de création">
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'info' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span className="nv-ai-tab-step">1</span>
            <span>Client & Analyse</span>
          </button>
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'brand' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('brand')}
          >
            <span className="nv-ai-tab-step">2</span>
            <span>Charte & Couleurs</span>
          </button>
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'icons' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('icons')}
          >
            <span className="nv-ai-tab-step">3</span>
            <span>Icônes & Boutons (3 états)</span>
          </button>
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'intro' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('intro')}
          >
            <span className="nv-ai-tab-step">4</span>
            <span>Introduction personnalisée</span>
          </button>
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'menu' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <span className="nv-ai-tab-step">5</span>
            <span>Interface & Menus automatiques</span>
          </button>
        </nav>

        {/* Corps de la modale */}
        <div className="nv-ai-body">
          {/* ONGLET 1 : Client & Analyse */}
          {activeTab === 'info' && (
            <div>
              {/* Sélecteur de mode de création */}
              <div className="nv-ai-mode-selector">
                <div className="nv-ai-mode-cards">
                  <button
                    type="button"
                    className={`nv-ai-mode-card ${creationMode === 'new' ? 'is-active' : ''}`}
                    onClick={() => setCreationMode('new')}
                  >
                    <div className="nv-ai-mode-card-title">
                      <Sparkles size={16} />
                      <strong>Créer une nouvelle visite</strong>
                    </div>
                    <p>Initialise un nouveau projet vierge dédié à ce client, sans écraser votre visite en cours.</p>
                  </button>
                  <button
                    type="button"
                    className={`nv-ai-mode-card ${creationMode === 'update' ? 'is-active' : ''}`}
                    onClick={() => setCreationMode('update')}
                  >
                    <div className="nv-ai-mode-card-title">
                      <Layers size={16} />
                      <strong>Appliquer à la visite en cours</strong>
                    </div>
                    <p>Conserve vos panoramas actuels (« {project.name || 'Visite en cours'} ») et met à jour l’identité visuelle.</p>
                  </button>
                </div>
              </div>

              <div className="nv-ai-grid">
              <div className="nv-ai-field">
                <label>
                  Nom commercial du client <span className="is-required">*</span>
                </label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. Le Mas des Oliviers, Hôtel Spa Grand Large..."
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (!projectName) setProjectName(e.target.value);
                    if (!introTitle) setIntroTitle(e.target.value);
                  }}
                  autoFocus
                />
              </div>

              <div className="nv-ai-field">
                <label>Nom du projet / de la visite</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. Visite immersive 360°, Saison 2026..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>Catégorie d'activité</label>
                <select
                  className="nv-ai-select"
                  value={activityCategory}
                  onChange={(e) => {
                    const cat = e.target.value as ActivityCategory;
                    setActivityCategory(cat);
                    const cfg = ACTIVITY_CATEGORIES.find((c) => c.id === cat);
                    if (cfg) {
                      setStyleId(cfg.defaultStyle);
                      setSeedColor(cfg.defaultSeed);
                      setColors(generateBrand(cfg.defaultSeed, cfg.defaultStyle));
                    }
                  }}
                >
                  {ACTIVITY_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="nv-ai-field">
                <label>Type de visite souhaité</label>
                <select
                  className="nv-ai-select"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as VisitType)}
                >
                  {VISIT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="nv-ai-field is-full">
                <label>
                  Site internet public du client (pour analyse et aspiration automatique)
                </label>
                <div className="nv-ai-input-with-action">
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="https://www.mon-etablissement.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                  <button
                    type="button"
                    className="nv-ai-btn-action"
                    disabled={analyzing || !website.trim()}
                    onClick={runWebsiteAnalysis}
                  >
                    {analyzing ? (
                      <>
                        <span className="nv-ai-spinner" />
                        <span>Analyse en cours…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Analyser le site internet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {analysisError && (
                <div className="nv-ai-alert nv-ai-alert-error is-full">
                  <AlertTriangle size={16} />
                  <span>{analysisError}</span>
                </div>
              )}

              {detected && (
                <div className="nv-ai-alert nv-ai-alert-success is-full">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Analyse réussie du site web :</strong>
                    <div style={{fontSize: '0.82rem', marginTop: '0.25rem'}}>
                      {(detected.services?.length ?? 0) > 0 && (
                        <span>Prestations identifiées : {(detected.services ?? []).slice(0, 4).join(', ')}. </span>
                      )}
                      {detected.notes && detected.notes.length > 0 && (
                        <span>{detected.notes[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="nv-ai-field is-full">
                <label>Logo du client</label>
                <div className="nv-ai-logo-row">
                  {logoUrl ? (
                    <div className="nv-ai-logo-preview">
                      <img src={logoUrl} alt="Logo client" />
                      <button
                        type="button"
                        className="nv-ai-btn-remove"
                        onClick={() => {
                          setLogoUrl('');
                          setLogoColors(null);
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <label className="nv-ai-upload-btn">
                      <Upload size={16} />
                      <span>Importer un fichier logo (PNG, JPG, SVG)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        style={{display: 'none'}}
                        onChange={handleLogoUpload}
                      />
                    </label>
                  )}
                  {logoColors && (
                    <span className="nv-ai-extracted-chip">
                      Couleurs du logo :{' '}
                      <span className="nv-ai-swatch" style={{background: logoColors.primary}} />
                      {logoColors.primary} ·{' '}
                      <span className="nv-ai-swatch" style={{background: logoColors.accent}} />
                      {logoColors.accent}
                    </span>
                  )}
                </div>
              </div>

              <div className="nv-ai-field">
                <label>
                  <Building2 size={14} style={{display: 'inline', marginRight: 4}} />
                  Adresse postale
                </label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. 12 avenue de la Plage"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>Ville & Code postal</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. 13260 Cassis"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>
                  <Phone size={14} style={{display: 'inline', marginRight: 4}} />
                  Téléphone
                </label>
                <input
                  type="tel"
                  className="nv-ai-input"
                  placeholder="Ex. +33 4 42 01 02 03"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>
                  <Mail size={14} style={{display: 'inline', marginRight: 4}} />
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  className="nv-ai-input"
                  placeholder="contact@etablissement.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="nv-ai-field is-full">
                <label>
                  <Calendar size={14} style={{display: 'inline', marginRight: 4}} />
                  Lien direct de réservation en ligne (optionnel)
                </label>
                <input
                  type="url"
                  className="nv-ai-input"
                  placeholder="https://booking.com/... ou https://etablissement.com/reserver"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                />
              </div>

              <div className="nv-ai-field is-full">
                <label>Langues souhaitées pour la visite</label>
                <div className="nv-ai-languages-selector">
                  {STUDIO_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`nv-ai-lang-chip ${selectedLanguages.includes(lang.code) ? 'is-selected' : ''}`}
                      onClick={() => toggleLanguage(lang.code)}
                    >
                      <span className="nv-ai-lang-flag">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {selectedLanguages.includes(lang.code) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* ONGLET 2 : Charte & Couleurs */}
          {activeTab === 'brand' && (
            <div className="nv-ai-brand-section">
              <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                Sélectionnez un style prédéfini adapté au client :
              </label>
              <div className="nv-ai-styles-grid">
                {STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`nv-ai-style-card ${styleId === st.id ? 'is-active' : ''}`}
                    onClick={() => handleStyleChange(st.id)}
                  >
                    <div className="nv-ai-style-card-head">
                      <strong>{st.label}</strong>
                    </div>
                    <div className="nv-ai-style-swatches">
                      <span style={{background: colors.primary}} />
                      <span style={{background: colors.secondary}} />
                      <span style={{background: colors.accent}} />
                    </div>
                  </button>
                ))}
              </div>

              <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginTop: '1.25rem', marginBottom: '0.5rem'}}>
                Palette personnalisée des 10 couleurs (cliquez pour ajuster) :
              </label>
              <div className="nv-ai-colors-grid">
                {(Object.keys(BRAND_COLOR_LABELS) as (keyof BrandColors)[]).map((key) => (
                  <div key={key} className="nv-ai-color-item">
                    <span className="nv-ai-color-name">{BRAND_COLOR_LABELS[key]}</span>
                    <div className="nv-ai-color-controls">
                      <input
                        type="color"
                        className="nv-ai-color-picker"
                        value={colors[key]}
                        onChange={(e) => handleColorUpdate(key, e.target.value)}
                      />
                      <input
                        type="text"
                        className="nv-ai-color-hex"
                        value={colors[key]}
                        onChange={(e) => handleColorUpdate(key, e.target.value)}
                        maxLength={7}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Aperçu interactif en direct */}
              <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                Aperçu en direct de l'identité visuelle
              </label>
              <div
                className="nv-ai-live-preview"
                style={{
                  background: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }}
              >
                <div className="nv-ai-preview-head">
                  <div>
                    <h3 style={{color: colors.text}}>{clientName || 'Nom de votre établissement'}</h3>
                    <small style={{color: colors.text, opacity: 0.75}}>
                      {address || 'Visite immersive 360°'} · Style {STYLES.find((s) => s.id === styleId)?.label}
                    </small>
                  </div>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        background: colors.primary,
                        color: readableOn(colors.primary),
                        fontWeight: 700,
                      }}
                    >
                      Primaire
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        background: colors.secondary,
                        color: readableOn(colors.secondary),
                        fontWeight: 700,
                      }}
                    >
                      Secondaire
                    </span>
                  </div>
                </div>

                <div className="nv-ai-preview-buttons">
                  <span
                    className="nv-ai-preview-btn"
                    style={{
                      background: colors.btnRest,
                      color: readableOn(colors.btnRest),
                      borderColor: colors.border,
                    }}
                  >
                    Bouton au repos
                  </span>
                  <span
                    className="nv-ai-preview-btn"
                    style={{
                      background: colors.btnHover,
                      color: readableOn(colors.btnHover),
                      borderColor: colors.glow,
                      boxShadow: `0 0 12px ${colors.glow}77`,
                    }}
                  >
                    Bouton au survol ✨
                  </span>
                  <span
                    className="nv-ai-preview-btn"
                    style={{
                      background: colors.btnPressed,
                      color: readableOn(colors.btnPressed),
                      borderColor: colors.border,
                      transform: 'scale(0.96)',
                      opacity: 0.9,
                    }}
                  >
                    Bouton à l’appui
                  </span>
                </div>
              </div>

              {/* Contrôle de contraste WCAG */}
              <div className="nv-ai-contrast-box">
                {contrastIssues.length === 0 ? (
                  <div className="nv-ai-contrast-ok">
                    <CheckCircle2 size={16} />
                    <span>Conformité WCAG AA validée : excellents contrastes et lisibilité irréprochable.</span>
                  </div>
                ) : (
                  contrastIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={issue.level === 'error' ? 'nv-ai-contrast-error' : 'nv-ai-contrast-warn'}
                    >
                      {issue.level === 'error' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                      <span>{issue.text}</span>
                    </div>
                  ))
                )}
                <div style={{color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.2rem'}}>
                  Contraste Texte sur Fond :{' '}
                  <strong>{contrastRatio(colors.text, colors.background).toFixed(1)} : 1</strong> (Seuil minimal recommandé : 4.5:1)
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 3 : Boutons & Icônes IA (3 états) */}
          {activeTab === 'icons' && (
            <div>
              <div className="nv-ai-icons-toolbar">
                <div className="nv-ai-toolbar-group">
                  <label>Forme :</label>
                  <div className="nv-ai-pill-selector">
                    {ICON_SHAPES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`nv-ai-pill-btn ${iconShape === s.id ? 'is-active' : ''}`}
                        onClick={() => setIconShape(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="nv-ai-toolbar-group">
                  <label>Finition :</label>
                  <div className="nv-ai-pill-selector">
                    <button
                      type="button"
                      className={`nv-ai-pill-btn ${iconFinish === 'plat' ? 'is-active' : ''}`}
                      onClick={() => setIconFinish('plat')}
                    >
                      Plat épuré
                    </button>
                    <button
                      type="button"
                      className={`nv-ai-pill-btn ${iconFinish === 'glossy' ? 'is-active' : ''}`}
                      onClick={() => setIconFinish('glossy')}
                    >
                      Brillant (Glossy)
                    </button>
                  </div>
                </div>

                {iconFinish === 'glossy' && (
                  <div className="nv-ai-pill-selector" aria-label="Couleurs du brillant">
                    <label>Fond <input type="color" value={glossyColors.background} onChange={e => setGlossyColors({...glossyColors, background: e.target.value})}/></label>
                    <label>Pictogramme <input type="color" value={glossyColors.pictogram} onChange={e => setGlossyColors({...glossyColors, pictogram: e.target.value})}/></label>
                    <label>Contour <input type="color" value={glossyColors.outline} onChange={e => setGlossyColors({...glossyColors, outline: e.target.value})}/></label>
                  </div>
                )}

                <div className="nv-ai-toolbar-group">
                  <label>Résolution PNG :</label>
                  <div className="nv-ai-pill-selector">
                    {([256, 512, 1024] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        className={`nv-ai-pill-btn ${iconResolution === res ? 'is-active' : ''}`}
                        onClick={() => setIconResolution(res)}
                      >
                        {res} × {res}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="nv-ai-state-switcher">
                  <span style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600}}>État simulé :</span>
                  {ICON_STATE_OPTIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`nv-ai-state-btn ${previewState === st.id ? 'is-active' : ''}`}
                      onClick={() => setPreviewState(st.id)}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Générateur d'icônes sur mesure par prompt textuel */}
              <div className="nv-ai-custom-box">
                <div className="nv-ai-custom-head">
                  <h4>
                    <Wand2 size={16} />
                    <span>Générateur d'icône IA personnalisée</span>
                  </h4>
                  <small style={{color: '#94a3b8', fontSize: '0.75rem'}}>
                    Générez une icône vectorielle sur mesure avec ses 3 états coordonnés
                  </small>
                </div>
                <div className="nv-ai-custom-row">
                  <input
                    type="text"
                    className="nv-ai-input"
                    placeholder="Ex. Borne de recharge électrique, terrasse vue mer, bar cocktail, wifi..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') generateCustomIcon(); }}
                  />
                  <button
                    type="button"
                    className="nv-ai-btn-action"
                    disabled={!customPrompt.trim()}
                    onClick={generateCustomIcon}
                  >
                    <Sparkles size={15} />
                    <span>Générer l'icône IA</span>
                  </button>
                </div>
              </div>

              {/* Grille des icônes avec 3 états interactifs */}
              <div className="nv-ai-icons-grid">
                {allIconSpecs.map((spec) => {
                  let effectiveState = previewState;
                  if (activeCardKey === spec.key) {
                    effectiveState = 'pressed';
                  } else if (hoveredCardKey === spec.key && previewState === 'normal') {
                    effectiveState = 'hover';
                  }

                  const svgCode = iconSvg(spec, colors, iconShape, effectiveState);
                  const svgUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;

                  return (
                    <div
                      key={spec.key}
                      className="nv-ai-icon-card"
                      onMouseEnter={() => setHoveredCardKey(spec.key)}
                      onMouseLeave={() => {
                        setHoveredCardKey(null);
                        setActiveCardKey(null);
                      }}
                      onMouseDown={() => setActiveCardKey(spec.key)}
                      onMouseUp={() => setActiveCardKey(null)}
                    >
                      <div className="nv-ai-icon-badge">
                        <img src={svgUri} alt={spec.label} />
                      </div>
                      <div className="nv-ai-icon-info">
                        <span className="nv-ai-icon-label" title={spec.label}>
                          {spec.label}
                        </span>
                        <span className="nv-ai-icon-filename">
                          {spec.key}_{effectiveState}.png
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barre d'exportation et d'intégration */}
              <div className="nv-ai-export-bar" style={{marginTop: '1.25rem'}}>
                <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap'}}>
                  <button
                    type="button"
                    className="nv-ai-btn-ghost"
                    disabled={!!packBusy}
                    onClick={downloadZip}
                    title="Télécharge l'archive ZIP contenant tous les PNG (256/512/1024px) et SVG vectoriels"
                  >
                    <Download size={16} style={{display: 'inline', marginRight: 6}} />
                    <span>Télécharger le pack ZIP ({iconResolution}px + SVG)</span>
                  </button>

                  <button
                    type="button"
                    className="nv-ai-btn-primary"
                    style={{background: appliedPack ? '#059669' : undefined}}
                    disabled={!!packBusy}
                    onClick={integrateIconsIntoProject}
                    title="Ajoute les 36 packs de 3 états directement dans la visite pour la barre, les flèches et la VR"
                  >
                    <FolderDown size={16} style={{display: 'inline', marginRight: 6}} />
                    <span>{appliedPack ? '✓ Icônes intégrées au projet' : 'Intégrer les 36 packs au projet'}</span>
                  </button>
                </div>

                {packMessage && (
                  <span style={{fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600}}>
                    {packMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 4 : Introduction automatique personnalisée (Module 5) */}
          {activeTab === 'intro' && (
            <div className="nv-ai-intro-container">
              {/* Bannière d'activation */}
              <div className="nv-ai-switch-banner">
                <div className="nv-ai-switch-info">
                  <h4>Écran d’introduction de la visite immersive</h4>
                  <p>Affiche un écran d’accueil immersif élégant avant la première vue panoramique 360°</p>
                </div>
                <label className="nv-ai-toggle" aria-label="Activer l'introduction">
                  <input
                    type="checkbox"
                    checked={introEnabled}
                    onChange={(e) => setIntroEnabled(e.target.checked)}
                  />
                  <span className="nv-ai-toggle-slider" />
                </label>
              </div>

              {introEnabled && (
                <>
                  <div className="nv-ai-intro-grid">
                    {/* Bloc Styles & Animations */}
                    <div className="nv-ai-intro-card">
                      <h4>
                        <Sparkles size={16} />
                        <span>Style visuel de l'introduction</span>
                      </h4>
                      <div className="nv-ai-intro-styles">
                        {INTRO_STYLES.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            className={`nv-ai-intro-style-btn ${introStyleId === st.id ? 'is-active' : ''}`}
                            onClick={() => setIntroStyleId(st.id)}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      <h4 style={{marginTop: '0.5rem'}}>
                        <Layers size={16} />
                        <span>Animation d'entrée & transition</span>
                      </h4>
                      <div className="nv-ai-anim-pills">
                        {INTRO_ANIMATIONS.map((anim) => (
                          <button
                            key={anim.id}
                            type="button"
                            className={`nv-ai-anim-pill ${introAnimation === anim.id ? 'is-active' : ''}`}
                            onClick={() => setIntroAnimation(anim.id)}
                          >
                            {anim.label}
                          </button>
                        ))}
                      </div>

                      <h4 style={{marginTop: '0.5rem'}}>
                        <Eye size={16} />
                        <span>Forme du logo</span>
                      </h4>
                      <div className="nv-ai-anim-pills">
                        {INTRO_LOGO_SHAPES.map((shape) => (
                          <button
                            key={shape.id}
                            type="button"
                            className={`nv-ai-anim-pill ${introLogoShape === shape.id ? 'is-active' : ''}`}
                            onClick={() => setIntroLogoShape(shape.id)}
                          >
                            {shape.label}
                          </button>
                        ))}
                      </div>

                      <div className="nv-ai-duration-row">
                        <label style={{fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600}}>
                          Durée d'affichage :
                        </label>
                        <input
                          type="range"
                          min={2}
                          max={15}
                          value={introDuration}
                          className="nv-ai-duration-slider"
                          onChange={(e) => setIntroDuration(Number(e.target.value))}
                        />
                        <span className="nv-ai-duration-val">{introDuration} s</span>
                      </div>
                    </div>

                    {/* Bloc Textes & Aperçu interactif */}
                    <div className="nv-ai-intro-card">
                      <h4>
                        <Building2 size={16} />
                        <span>Textes de l'écran d'accueil</span>
                      </h4>

                      <div className="nv-ai-field">
                        <label>Titre de l'établissement</label>
                        <input
                          type="text"
                          className="nv-ai-input"
                          maxLength={80}
                          placeholder={clientName || 'Nom de votre établissement'}
                          value={introTitle}
                          onChange={(e) => setIntroTitle(e.target.value)}
                        />
                      </div>

                      <div className="nv-ai-field">
                        <label>Phrase d'accueil / Sous-titre</label>
                        <input
                          type="text"
                          className="nv-ai-input"
                          maxLength={160}
                          placeholder="Bienvenue dans votre visite immersive 360°"
                          value={introSubtitle}
                          onChange={(e) => setIntroSubtitle(e.target.value)}
                        />
                      </div>

                      <div className="nv-ai-field">
                        <label>Libellé du bouton d'action</label>
                        <input
                          type="text"
                          className="nv-ai-input"
                          maxLength={30}
                          placeholder="Découvrir"
                          value={introButtonLabel}
                          onChange={(e) => setIntroButtonLabel(e.target.value)}
                        />
                      </div>

                      {/* Aperçu miniature */}
                      <label style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.25rem'}}>
                        Aperçu miniature :
                      </label>
                      <div
                        className="nv-ai-intro-preview-frame"
                        style={{
                          backgroundColor: colors.background,
                          color: colors.text,
                        }}
                      >
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt="Logo client"
                            className="nv-ai-intro-preview-logo"
                            style={{
                              borderRadius: introLogoShape === 'round' ? '999px' : introLogoShape === 'square' ? '6px' : '0'
                            }}
                          />
                        )}
                        <h3 className="nv-ai-intro-preview-title" style={{color: colors.text}}>
                          {introTitle || clientName || 'Établissement'}
                        </h3>
                        <p className="nv-ai-intro-preview-sub" style={{color: colors.accent}}>
                          {introSubtitle}
                        </p>
                        <button
                          type="button"
                          className="nv-ai-intro-preview-btn"
                          style={{
                            backgroundColor: colors.btnRest,
                            color: readableOn(colors.btnRest),
                          }}
                        >
                          {introButtonLabel || 'Découvrir'}
                        </button>
                      </div>

                      <div className="nv-ai-test-intro-action">
                        <button
                          type="button"
                          className="nv-ai-btn-action"
                          onClick={() => setPreviewIntroActive(true)}
                        >
                          <Play size={15} />
                          <span>Tester l'introduction en plein écran</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ONGLET 5 : Interface & Menus automatiques (Module 7) */}
          {activeTab === 'menu' && (
            <div className="nv-ai-menu-container">
              {/* Disposition de la barre */}
              <div>
                <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                  Style et disposition de la barre de navigation :
                </label>
                <div className="nv-ai-layouts-grid">
                  {AUTO_BAR_LAYOUTS.map((layout) => (
                    <div
                      key={layout.id}
                      className={`nv-ai-layout-card ${barLayout === layout.id ? 'is-active' : ''}`}
                      onClick={() => setBarLayout(layout.id)}
                    >
                      <strong>{layout.label}</strong>
                      <small>{layout.description}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aperçu en direct de la barre de navigation */}
              <div>
                <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                  Aperçu en direct de votre barre de visite immersive :
                </label>
                <div className="nv-ai-live-bar-preview">
                  <div
                    className="nv-ai-simulated-bar"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: barLayout === 'minimal' ? 1 : 2,
                      borderStyle: 'solid',
                      borderRadius: barLayout === 'floating' ? 80 : barLayout === 'minimal' ? 24 : 60,
                      color: colors.text,
                    }}
                  >
                    {menuProposals.filter((p) => selectedMenuKeys.has(p.key)).map((proposal) => {
                      const spec = allIconSpecs.find((s) => s.key === proposal.iconKey) || allIconSpecs[0];
                      const svgCode = iconSvg(spec, colors, iconShape, 'normal');
                      const svgUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;

                      return (
                        <div key={proposal.key} className="nv-ai-simulated-btn">
                          <div className="nv-ai-simulated-btn-badge">
                            <img
                              src={svgUri}
                              alt={proposal.title}
                              style={{width: 36, height: 36, maxWidth: 36, maxHeight: 36, objectFit: 'contain', display: 'block'}}
                            />
                          </div>
                          <span style={{color: colors.text}}>
                            {menuCustomTitles[proposal.key] || proposal.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Liste des boutons intelligents proposés */}
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                  <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1'}}>
                    Boutons intelligents recommandés par l’IA (cochez et personnalisez) :
                  </label>
                  <div className="nv-ai-proposals-actions">
                    <button
                      type="button"
                      className="nv-ai-pill-btn"
                      onClick={() => setSelectedMenuKeys(new Set(menuProposals.map((p) => p.key)))}
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      className="nv-ai-pill-btn"
                      onClick={() => setSelectedMenuKeys(new Set(menuProposals.filter((p) => p.recommended).map((p) => p.key)))}
                    >
                      Recommandés uniquement
                    </button>
                  </div>
                </div>

                <div className="nv-ai-proposals-list">
                  {menuProposals.map((prop) => {
                    const isSelected = selectedMenuKeys.has(prop.key);
                    const spec = allIconSpecs.find((s) => s.key === prop.iconKey) || allIconSpecs[0];
                    const svgCode = iconSvg(spec, colors, iconShape, isSelected ? 'hover' : 'normal');
                    const svgUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;

                    return (
                      <div
                        key={prop.key}
                        className={`nv-ai-proposal-row ${isSelected ? 'is-selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMenuProposal(prop.key)}
                          style={{accentColor: '#38bdf8', width: 18, height: 18, cursor: 'pointer', flexShrink: 0}}
                        />
                        <div className="nv-ai-proposal-icon">
                          <img
                            src={svgUri}
                            alt={prop.title}
                            style={{width: 40, height: 40, maxWidth: 40, maxHeight: 40, objectFit: 'contain', display: 'block'}}
                          />
                        </div>
                        <div className="nv-ai-proposal-info">
                          <div className="nv-ai-proposal-info-top">
                            <input
                              type="text"
                              className="nv-ai-proposal-input"
                              value={menuCustomTitles[prop.key] ?? prop.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMenuCustomTitles((prev) => ({...prev, [prop.key]: val}));
                              }}
                            />
                            {prop.recommended && (
                              <span className="nv-ai-proposal-badge is-rec">Recommandé</span>
                            )}
                            <span className="nv-ai-proposal-badge">
                              {prop.type === 'lien' ? 'Lien externe' : prop.type === 'photos' ? 'Galerie' : prop.type === 'plan' ? 'Plan interactif' : 'Information'}
                            </span>
                          </div>
                          <span className="nv-ai-proposal-desc">{prop.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page d'action multi-étapes */}
        <footer className="nv-ai-footer">
          <div className="nv-ai-footer-left">
            <span>NovaStudio AI · Assistant global</span>
            {hasContrastError && <span style={{color: '#f43f5e'}}> · ⚠️ Contrastes WCAG à surveiller</span>}
            {appliedPack && <span style={{color: '#34d399'}}> · ✓ Packs 3 états prêts</span>}
            {selectedMenuKeys.size > 0 && <span style={{color: '#38bdf8'}}> · {selectedMenuKeys.size} boutons actifs</span>}
          </div>
          <div className="nv-ai-footer-right">
            {activeTab === 'info' && (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={onClose}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={() => {
                    if (!clientName.trim()) {
                      setAnalysisError('Renseigne le nom commercial du client avant de continuer.');
                      return;
                    }
                    setAnalysisError('');
                    setActiveTab('brand');
                  }}
                >
                  <span>Continuer vers la Charte</span>
                  <ArrowRight size={16} style={{display: 'inline', marginLeft: 4}} />
                </button>
              </>
            )}

            {activeTab === 'brand' && (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={() => setActiveTab('info')}>
                  <ArrowLeft size={16} style={{display: 'inline', marginRight: 4}} />
                  Précédent
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={() => setActiveTab('icons')}
                >
                  <span>Continuer vers les Icônes</span>
                  <ArrowRight size={16} style={{display: 'inline', marginLeft: 4}} />
                </button>
              </>
            )}

            {activeTab === 'icons' && (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={() => setActiveTab('brand')}>
                  <ArrowLeft size={16} style={{display: 'inline', marginRight: 4}} />
                  Précédent
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={() => setActiveTab('intro')}
                >
                  <span>Continuer vers l'Introduction</span>
                  <ArrowRight size={16} style={{display: 'inline', marginLeft: 4}} />
                </button>
              </>
            )}

            {activeTab === 'intro' && (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={() => setActiveTab('icons')}>
                  <ArrowLeft size={16} style={{display: 'inline', marginRight: 4}} />
                  Précédent
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={() => setActiveTab('menu')}
                >
                  <span>Continuer vers les Menus</span>
                  <ArrowRight size={16} style={{display: 'inline', marginLeft: 4}} />
                </button>
              </>
            )}

            {activeTab === 'menu' && (
              <>
                <button type="button" className="nv-ai-btn-ghost" onClick={() => setActiveTab('intro')}>
                  <ArrowLeft size={16} style={{display: 'inline', marginRight: 4}} />
                  Précédent
                </button>
                <button
                  type="button"
                  className="nv-ai-btn-primary"
                  onClick={handleApply}
                >
                  <Sparkles size={16} />
                  <span>{creationMode === 'new' ? '✨ Créer la nouvelle visite (IA)' : 'Valider & Appliquer au projet'}</span>
                </button>
              </>
            )}
          </div>
        </footer>
      </div>

      {/* Prévisualisation plein écran de l'intro native */}
      {previewIntroActive && (
        <div className="nv-ai-fullscreen-intro">
          <button
            type="button"
            className="nv-ai-fullscreen-close"
            onClick={() => setPreviewIntroActive(false)}
          >
            ✕ Quitter l'aperçu
          </button>
          <NativeIntro
            design={{
              enabled: true,
              styleId: introStyleId,
              animation: introAnimation,
              title: introTitle.trim() || clientName.trim() || 'Établissement',
              subtitle: introSubtitle.trim(),
              buttonLabel: introButtonLabel.trim() || 'Découvrir',
              backgroundColor: colors.background,
              buttonColor: colors.btnRest,
              welcomeColor: introWelcomeColor(colors.accent, colors.background),
              logoShape: introLogoShape,
              logoDataUrl: logoUrl || undefined,
            }}
            durationSec={introDuration}
            onDone={() => setPreviewIntroActive(false)}
          />
        </div>
      )}
    </div>
  );
}
