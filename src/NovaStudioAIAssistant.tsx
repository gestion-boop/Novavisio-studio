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
  FolderDown
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
  toBarPatch,
  isHex,
  type BrandColors,
  type BrandKit,
  type StyleId
} from './brandKit';
import {
  BRAND_ICON_SET,
  type BrandIconSpec
} from './brandIconSet';
import {
  iconSvg,
  svgToPng,
  type IconShape,
  type IconState,
  ICON_SHAPES,
  ICON_STATES
} from './brandIcons';
import {
  STUDIO_LANGUAGES,
  type StudioLanguage,
  type ClientProfile,
  type StudioProject,
  type CustomIcon,
  type ImportedButtonSet,
  readImage
} from './storage';

export type NovaStudioAIProps = {
  project: StudioProject;
  onApply: (updated: Partial<StudioProject>, clientProfile: ClientProfile, brandKit: BrandKit) => void;
  onClose: () => void;
};

export function NovaStudioAIAssistant({project, onApply, onClose}: NovaStudioAIProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'brand' | 'icons'>('info');

  // Champs Module 1 — Création et analyse
  const [clientName, setClientName] = useState(project.clientProfile?.name || project.name || '');
  const [projectName, setProjectName] = useState(project.name || '');
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>(
    (project.clientProfile?.activityCategory as ActivityCategory) || 'autre'
  );
  const [website, setWebsite] = useState(project.clientProfile?.website || '');
  const [address, setAddress] = useState(project.clientProfile?.address || '');
  const [city, setCity] = useState(project.clientProfile?.city || '');
  const [phone, setPhone] = useState(project.clientProfile?.phone || '');
  const [email, setEmail] = useState(project.clientProfile?.email || '');
  const [bookingUrl, setBookingUrl] = useState(project.clientProfile?.bookingUrl || '');
  const [facebook, setFacebook] = useState(project.clientProfile?.facebook || '');
  const [instagram, setInstagram] = useState(project.clientProfile?.instagram || '');
  const [visitType, setVisitType] = useState<VisitType>(
    (project.clientProfile?.visitType as VisitType) || (project.vrEnabled ? 'hybrid' : 'premium')
  );
  const [selectedLanguages, setSelectedLanguages] = useState<StudioLanguage[]>(
    project.languages && project.languages.length ? project.languages : ['fr', 'en']
  );

  // Logo & Couleurs
  const [logoUrl, setLogoUrl] = useState<string>(project.clientProfile?.logoUrl || '');
  const [logoColors, setLogoColors] = useState<{primary: string; accent: string} | null>(null);

  // Données détectées
  const [analyzing, setAnalyzing] = useState(false);
  const [detected, setDetected] = useState<DetectedInfo | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Module 2 — Charte graphique
  const [styleId, setStyleId] = useState<StyleId>(
    (project.brandKit?.styleId as StyleId) || 'moderne'
  );
  const [seedColor, setSeedColor] = useState<string>(
    project.brandKit?.seed && isHex(project.brandKit.seed) ? project.brandKit.seed : '#2f8fb5'
  );
  const [colors, setColors] = useState<BrandColors>(
    project.brandKit?.colors || generateBrand('#2f8fb5', 'moderne')
  );

  // Module 3 — Icônes et Boutons (Phase 2)
  const [iconShape, setIconShape] = useState<IconShape>('circle');
  const [iconFinish, setIconFinish] = useState<'plat' | 'glossy'>('plat');
  const [iconResolution, setIconResolution] = useState<256 | 512 | 1024>(512);
  const [previewState, setPreviewState] = useState<IconState>('normal');
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customIcons, setCustomIcons] = useState<BrandIconSpec[]>([]);
  const [packBusy, setPackBusy] = useState('');
  const [packMessage, setPackMessage] = useState('');
  const [appliedPack, setAppliedPack] = useState(false);

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
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  // Import local d'un logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImage(file);
      setLogoUrl(dataUrl);

      try {
        const pal = await analyzeLogoColors(dataUrl);
        setLogoColors(pal);
        if (pal.primary && isHex(pal.primary)) {
          setSeedColor(pal.primary);
          setColors(generateBrand(pal.primary, styleId));
        }
      } catch {
        // Logo sans couleur dominante détectable
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Fichier image non supporté');
    }
    e.target.value = '';
  };

  // Changement de style de charte
  const handleStyleChange = (newStyle: StyleId) => {
    setStyleId(newStyle);
    setColors(generateBrand(seedColor, newStyle));
  };

  // Changement de couleur de départ
  const handleSeedChange = (hex: string) => {
    setSeedColor(hex);
    if (isHex(hex)) {
      setColors(generateBrand(hex, styleId));
    }
  };

  // Modification manuelle d'une des 10 couleurs
  const handleColorUpdate = (key: keyof BrandColors, hex: string) => {
    if (isHex(hex)) {
      setColors((prev) => ({...prev, [key]: hex}));
    }
  };

  // Téléchargement du pack ZIP haute définition
  const downloadPackZip = async () => {
    setPackBusy('Préparation de l’export ZIP…');
    setPackMessage('');
    try {
      const {default: JSZip} = await import('jszip');
      const zip = new JSZip();
      const safeName = (clientName || 'novastudio').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const folderName = `pack-${safeName}-${styleId}-${iconShape}-${iconResolution}px`;
      const folder = zip.folder(folderName)!;
      const totalFiles = allIconSpecs.length * ICON_STATES.length;

      let count = 0;
      for (const spec of allIconSpecs) {
        for (const st of ICON_STATES) {
          count++;
          setPackBusy(`Rendu ${count} / ${totalFiles} (${iconResolution}px)…`);
          const svg = iconSvg(spec, colors, iconShape, st);
          const pngDataUrl = await svgToPng(svg, iconResolution);
          const base64Data = pngDataUrl.split(',')[1];
          folder.file(`${spec.key}_${st}.png`, base64Data, {base64: true});
          folder.file(`${spec.key}_${st}.svg`, svg);
        }
      }

      setPackBusy('Compression de l’archive ZIP…');
      const blob = await zip.generateAsync({type: 'blob'});
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

    // Matching ou création de noeuds vectoriels
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
        const normalSvg = iconSvg(spec, colors, iconShape, 'normal');
        const hoverSvg = iconSvg(spec, colors, iconShape, 'hover');
        const pressedSvg = iconSvg(spec, colors, iconShape, 'pressed');

        const [normalData, hoverData, pressedData] = await Promise.all([
          svgToPng(normalSvg, 256),
          svgToPng(hoverSvg, 256),
          svgToPng(pressedSvg, 256)
        ]);

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

  // Validation finale et application au projet
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

    const barPatch = toBarPatch(colors);

    // Préparation des icônes pour le projet si demandé
    const iconsToAdd: CustomIcon[] = [...project.icons];
    const buttonSetsToAdd: ImportedButtonSet[] = [...(project.buttonSets || [])];

    if (appliedPack) {
      for (const spec of allIconSpecs) {
        const normalSvg = iconSvg(spec, colors, iconShape, 'normal');
        const hoverSvg = iconSvg(spec, colors, iconShape, 'hover');
        const pressedSvg = iconSvg(spec, colors, iconShape, 'pressed');

        const [normalData, hoverData, pressedData] = await Promise.all([
          svgToPng(normalSvg, 256),
          svgToPng(hoverSvg, 256),
          svgToPng(pressedSvg, 256)
        ]);

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
    }

    const projectUpdate: Partial<StudioProject> = {
      name: projectName.trim() || clientName.trim(),
      clientProfile,
      brandKit,
      barStyle: {
        ...project.barStyle,
        ...barPatch,
      },
      languages: selectedLanguages,
      vrEnabled: visitType === 'vr' || visitType === 'hybrid',
      icons: iconsToAdd,
      buttonSets: buttonSetsToAdd,
    };

    onApply(projectUpdate, clientProfile, brandKit);
    onClose();
  };

  return (
    <div className="nv-ai-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nv-ai-modal" role="dialog" aria-modal="true" aria-label="NovaStudio AI">
        {/* Entête */}
        <header className="nv-ai-header">
          <div className="nv-ai-header-title">
            <div className="nv-ai-badge-sparkle">
              <Sparkles size={24} />
            </div>
            <div>
              <h2>
                NovaStudio AI
                <span className="nv-ai-tag">Création intelligente</span>
              </h2>
              <p>
                Automatise la préparation complète de votre visite immersive 360° : coordonnées,
                charte graphique, boutons et points interactifs.
              </p>
            </div>
          </div>
          <button className="nv-ai-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {/* Onglets d'étapes */}
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
            <span>Charte graphique & Couleurs</span>
          </button>
          <button
            type="button"
            className={`nv-ai-tab ${activeTab === 'icons' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('icons')}
          >
            <span className="nv-ai-tab-step">3</span>
            <span>Boutons & Icônes IA (3 états)</span>
          </button>
        </nav>

        {/* Corps de la modale */}
        <div className="nv-ai-body">
          {activeTab === 'info' && (
            <div className="nv-ai-grid">
              {/* Nom du client */}
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
                  }}
                  autoFocus
                />
              </div>

              {/* Nom du projet */}
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

              {/* Catégorie d'activité */}
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

              {/* Type de visite */}
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

              {/* Site Internet & Analyse IA */}
              <div className="nv-ai-field is-wide">
                <label>
                  Site internet
                  {detected && <span className="badge-detected">✓ Analysé par l’IA</span>}
                </label>
                <div className="nv-ai-website-row">
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="https://www.mon-etablissement.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                  <button
                    type="button"
                    className="nv-ai-analyze-btn"
                    disabled={analyzing || !website.trim()}
                    onClick={runWebsiteAnalysis}
                  >
                    <Sparkles size={16} />
                    <span>{analyzing ? 'Analyse en cours…' : 'Analyser avec NovaStudio AI'}</span>
                  </button>
                </div>
              </div>

              {/* Logo du client */}
              <div className="nv-ai-field is-wide">
                <label>Logo du client</label>
                <div className="nv-ai-logo-zone">
                  <div className="nv-ai-logo-preview">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo client" />
                    ) : (
                      <Building2 size={24} color="#64748b" />
                    )}
                  </div>
                  <div className="nv-ai-logo-actions">
                    <label className="nv-ai-file-btn">
                      <Upload size={14} style={{display: 'inline', marginRight: 4}} />
                      Importer un logo (PNG, JPG, WebP)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{display: 'none'}}
                        onChange={handleLogoUpload}
                      />
                    </label>
                    <span>
                      {logoColors
                        ? `Couleurs extraites du logo : ${logoColors.primary} / ${logoColors.accent}`
                        : 'Importe le logo ou laisse l’IA l’extraire automatiquement du site web.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Adresse et Ville */}
              <div className="nv-ai-field">
                <label>Adresse</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. 12 avenue des Plages"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>Ville</label>
                <input
                  type="text"
                  className="nv-ai-input"
                  placeholder="Ex. Biarritz, Paris, Annecy..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {/* Téléphone et Email */}
              <div className="nv-ai-field">
                <label>Téléphone</label>
                <input
                  type="tel"
                  className="nv-ai-input"
                  placeholder="Ex. +33 4 68 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="nv-ai-field">
                <label>Adresse e-mail</label>
                <input
                  type="email"
                  className="nv-ai-input"
                  placeholder="Ex. contact@etablissement.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* URL de réservation */}
              <div className="nv-ai-field">
                <label>Lien de réservation (moteur direct, Booking, TheFork, Airbnb...)</label>
                <input
                  type="url"
                  className="nv-ai-input"
                  placeholder="https://booking.com/hotel/..."
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                />
              </div>

              {/* Réseaux sociaux */}
              <div className="nv-ai-field">
                <label>Réseaux sociaux (Facebook / Instagram)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="Instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                  <input
                    type="url"
                    className="nv-ai-input"
                    placeholder="Facebook"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                </div>
              </div>

              {/* Langues souhaitées */}
              <div className="nv-ai-field is-wide">
                <label>Langues souhaitées pour la visite</label>
                <div style={{display: 'flex', gap: '0.65rem', flexWrap: 'wrap'}}>
                  {STUDIO_LANGUAGES.map((lang) => {
                    const isChecked = selectedLanguages.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`nv-ai-chip ${isChecked ? 'is-selected' : ''}`}
                        style={{
                          cursor: 'pointer',
                          border: isChecked ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                          background: isChecked ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                        }}
                        onClick={() => {
                          if (isChecked) {
                            if (selectedLanguages.length > 1) {
                              setSelectedLanguages(selectedLanguages.filter((c) => c !== lang.code));
                            }
                          } else {
                            setSelectedLanguages([...selectedLanguages, lang.code]);
                          }
                        }}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {isChecked && <Check size={13} color="#38bdf8" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Erreur d'analyse éventuelle */}
              {analysisError && (
                <div className="nv-ai-field is-wide" style={{color: '#f43f5e', fontSize: '0.85rem'}}>
                  ⚠️ {analysisError}
                </div>
              )}

              {/* Synthèse des données détectées */}
              {detected && (
                <div className="nv-ai-field is-wide nv-ai-detected-card">
                  <div className="nv-ai-detected-head">
                    <h4>
                      <CheckCircle2 size={16} />
                      Informations publiques récupérées sur le site
                    </h4>
                    <span style={{fontSize: '0.78rem', color: '#94a3b8'}}>
                      Vérifie et complète les données avant validation
                    </span>
                  </div>
                  <div className="nv-ai-detected-chips">
                    {detected.colors.length > 0 && (
                      <div className="nv-ai-chip">
                        <span>Palette du site :</span>
                        {detected.colors.slice(0, 6).map((c, i) => (
                          <i key={i} className="color-dot" style={{background: c}} title={c} />
                        ))}
                      </div>
                    )}
                    {detected.fonts.length > 0 && (
                      <div className="nv-ai-chip">
                        <span>Typographies :</span>
                        <strong>{detected.fonts.slice(0, 3).join(', ')}</strong>
                      </div>
                    )}
                    {detected.phone && (
                      <div className="nv-ai-chip">
                        <Phone size={12} /> {detected.phone}
                      </div>
                    )}
                    {detected.email && (
                      <div className="nv-ai-chip">
                        <Mail size={12} /> {detected.email}
                      </div>
                    )}
                    {detected.bookingUrl && (
                      <div className="nv-ai-chip">
                        <Calendar size={12} /> Réservation détectée
                      </div>
                    )}
                    {detected.services && detected.services.length > 0 && (
                      <div className="nv-ai-chip">
                        <Layers size={12} /> {detected.services.length} prestations identifiées
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'brand' && (
            <div>
              {/* Choix du style de la charte */}
              <div style={{marginBottom: '1rem'}}>
                <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                  Ambiance graphique & style de la charte
                </label>
                <div className="nv-ai-styles-selector">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`nv-ai-style-card ${styleId === s.id ? 'is-selected' : ''}`}
                      onClick={() => handleStyleChange(s.id)}
                    >
                      <strong>{s.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              {/* Couleur de départ (graine) */}
              <div style={{marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1'}}>
                  Couleur de départ (seed) :
                </label>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <input
                    type="color"
                    className="nv-ai-color-picker"
                    value={seedColor}
                    onChange={(e) => handleSeedChange(e.target.value)}
                  />
                  <input
                    type="text"
                    className="nv-ai-color-hex"
                    value={seedColor}
                    onChange={(e) => handleSeedChange(e.target.value)}
                    maxLength={7}
                  />
                </div>
                {detected?.themeColor && (
                  <button
                    type="button"
                    className="nv-ai-btn-ghost"
                    style={{padding: '0.25rem 0.65rem', fontSize: '0.78rem'}}
                    onClick={() => handleSeedChange(detected.themeColor!)}
                  >
                    Reprendre la couleur du site ({detected.themeColor})
                  </button>
                )}
              </div>

              {/* Grille des 10 couleurs */}
              <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '0.5rem'}}>
                Palette personnalisée des 10 couleurs du projet
              </label>
              <div className="nv-ai-colors-grid">
                {(Object.keys(BRAND_COLOR_LABELS) as Array<keyof BrandColors>).map((key) => (
                  <div key={key} className="nv-ai-color-row">
                    <span className="nv-ai-color-label">{BRAND_COLOR_LABELS[key]}</span>
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

          {activeTab === 'icons' && (
            <div>
              {/* Barre de contrôle des icônes : Forme, Finition et Résolution */}
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
                      Épuré / Plat
                    </button>
                    <button
                      type="button"
                      className={`nv-ai-pill-btn ${iconFinish === 'glossy' ? 'is-active' : ''}`}
                      onClick={() => setIconFinish('glossy')}
                    >
                      Glossy 3D
                    </button>
                  </div>
                </div>

                <div className="nv-ai-toolbar-group">
                  <label>Résolution export :</label>
                  <div className="nv-ai-pill-selector">
                    <button
                      type="button"
                      className={`nv-ai-pill-btn ${iconResolution === 256 ? 'is-active' : ''}`}
                      onClick={() => setIconResolution(256)}
                      title="256x256 px - Web & Mobile"
                    >
                      256 px
                    </button>
                    <button
                      type="button"
                      className={`nv-ai-pill-btn ${iconResolution === 512 ? 'is-active' : ''}`}
                      onClick={() => setIconResolution(512)}
                      title="512x512 px - Recommandé VR WebXR"
                    >
                      512 px (VR)
                    </button>
                    <button
                      type="button"
                      className={`nv-ai-pill-btn ${iconResolution === 1024 ? 'is-active' : ''}`}
                      onClick={() => setIconResolution(1024)}
                      title="1024x1024 px - Ultra HD"
                    >
                      1024 px (HD)
                    </button>
                  </div>
                </div>
              </div>

              {/* Onglets de simulation des 3 états (Normal / Survol / Pressé) */}
              <div className="nv-ai-state-tabs" role="tablist" aria-label="État de prévisualisation des icônes">
                <button
                  type="button"
                  className={`nv-ai-state-btn ${previewState === 'normal' ? 'is-active' : ''}`}
                  onClick={() => setPreviewState('normal')}
                >
                  <span>1. État NORMAL (Repos)</span>
                </button>
                <button
                  type="button"
                  className={`nv-ai-state-btn ${previewState === 'hover' ? 'is-active' : ''}`}
                  onClick={() => setPreviewState('hover')}
                >
                  <span>2. État SURVOL ✨ (Lumineux)</span>
                </button>
                <button
                  type="button"
                  className={`nv-ai-state-btn ${previewState === 'pressed' ? 'is-active' : ''}`}
                  onClick={() => setPreviewState('pressed')}
                >
                  <span>3. État PRESSÉ (Enfoncé)</span>
                </button>
              </div>

              {/* Zone générateur d'icônes personnalisées par IA */}
              <div className="nv-ai-custom-box">
                <div className="nv-ai-custom-head">
                  <h4>
                    <Wand2 size={16} />
                    Générateur d’icône sur mesure par l'IA
                  </h4>
                  <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                    Décris un équipement ou service (ex. borne de recharge, cocktail, vue mer...)
                  </span>
                </div>
                <div className="nv-ai-custom-row">
                  <input
                    type="text"
                    className="nv-ai-input"
                    placeholder="Ex. Borne de recharge électrique, Terrasse panoramique, Bar lounge..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') generateCustomIcon(); }}
                  />
                  <button
                    type="button"
                    className="nv-ai-analyze-btn"
                    disabled={!customPrompt.trim()}
                    onClick={generateCustomIcon}
                  >
                    <Sparkles size={15} />
                    <span>Créer l'icône</span>
                  </button>
                </div>
              </div>

              {/* Grille des 36 icônes sectorielles */}
              <div className="nv-ai-icons-grid" role="list">
                {allIconSpecs.map((spec) => {
                  const stateForCard = activeCardKey === spec.key
                    ? 'pressed'
                    : hoveredCardKey === spec.key
                    ? 'hover'
                    : previewState;

                  const svg = iconSvg(spec, colors, iconShape, stateForCard);

                  return (
                    <div
                      key={spec.key}
                      className="nv-ai-icon-card"
                      onMouseEnter={() => setHoveredCardKey(spec.key)}
                      onMouseLeave={() => { setHoveredCardKey(null); setActiveCardKey(null); }}
                      onMouseDown={() => setActiveCardKey(spec.key)}
                      onMouseUp={() => setActiveCardKey(null)}
                      title={`Double-clic pour tester · ${spec.label}`}
                    >
                      <div
                        className="nv-ai-icon-badge"
                        dangerouslySetInnerHTML={{__html: svg}}
                      />
                      <div className="nv-ai-icon-info">
                        <span className="nv-ai-icon-label">{spec.label}</span>
                        <span className="nv-ai-icon-filename">{`${spec.key}_${stateForCard}.png`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barre d'actions d'export et d'intégration */}
              <div className="nv-ai-export-bar">
                <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
                  <button
                    type="button"
                    className="nv-ai-btn-ghost"
                    disabled={!!packBusy}
                    onClick={downloadPackZip}
                    title="Télécharge l'archive ZIP contenant les 108 fichiers PNG HD et les SVG vectoriels"
                  >
                    <Download size={16} style={{display: 'inline', marginRight: 6}} />
                    <span>{packBusy || `Télécharger le pack ZIP (${allIconSpecs.length * 3} fichiers HD)`}</span>
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
        </div>

        {/* Pied de page d'action */}
        <footer className="nv-ai-footer">
          <div className="nv-ai-footer-left">
            <span>NovaStudio AI · Phases 1 & 2</span>
            {hasContrastError && <span style={{color: '#f43f5e'}}> · ⚠️ Contrastes WCAG à surveiller</span>}
            {appliedPack && <span style={{color: '#34d399'}}> · ✓ Pack d'icônes prêt</span>}
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
                  <span>Passer aux Icônes & Boutons (3 états)</span>
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
                  onClick={handleApply}
                >
                  <Sparkles size={16} />
                  <span>Valider & Appliquer au projet</span>
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
