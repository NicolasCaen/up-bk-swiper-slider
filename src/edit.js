import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    InspectorControls,
    MediaUpload,
    MediaUploadCheck,
    MediaPlaceholder,
    RichText
} from '@wordpress/block-editor';
import { 
    PanelBody, 
    Button, 
    ToggleControl, 
    RangeControl,
    SelectControl,
    TextControl,
    TabPanel,
    Notice
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState, useRef } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import './editor.scss';

const ALLOWED_MEDIA_TYPES = ['image'];

export default function Edit({ attributes, setAttributes }) {
    const {
        slides,
        imageSource,
        metaKey,
        gap,
        fixedHeight,
        slideHeight,
        objectFit,
        imageSize,
        aspectRatio,
        showFigcaption,
        autoplay,
        autoplaySpeed,
        arrows,
        autoHideArrows,
        dots,
        infinite,
        speed,
        slidesToShow,
        slidesToScroll,
        fade,
        centerMode,
        adaptiveHeight,
        pauseOnHover,
        swipe,
        breakpoints,
        responsive,
        arrowType,
        arrowPosition,
        variableWidth,
        navIconSize,
        navGap,
        navRadius,
        navPadding
    } = attributes;

    const blockProps = useBlockProps();
    const [attachments, setAttachments] = useState([]);
    const [tabletPanelOpen, setTabletPanelOpen] = useState(false);
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0);
    const [isEditingGallery, setIsEditingGallery] = useState(false);
    const [mediaArray, setMediaArray] = useState(slides);
    const [startIndex, setStartIndex] = useState(0);
    const captionSaveTimers = useRef({});

    const saveCaptionToMedia = (attachmentId, value) => {
        if (!attachmentId) return;
        // debounce per attachment id
        const timers = captionSaveTimers.current;
        if (timers[attachmentId]) clearTimeout(timers[attachmentId]);
        timers[attachmentId] = setTimeout(() => {
            apiFetch({
                path: `/wp/v2/media/${attachmentId}`,
                method: 'POST',
                data: { caption: value }
            }).catch(() => {/* silent */});
        }, 600);
    };

    const handlePrevClick = () => {
        setStartIndex(prev => Math.max(0, prev - slidesToShow));
    };

    const handleNextClick = () => {
        setStartIndex(prev => Math.min(mediaArray.length - slidesToShow, prev + slidesToShow));
    };

    // Récupérer l'ID du post courant
    const postId = useSelect((select) => {
        const { getCurrentPostId } = select('core/editor');
        return getCurrentPostId();
    }, []);

    // Récupérer les metas du post courant (pour lire la meta des IDs si accessible)
    const postMeta = useSelect((select) => {
        const { getEditedPostAttribute } = select('core/editor');
        try {
            return getEditedPostAttribute('meta') || {};
        } catch (e) {
            return {};
        }
    }, []);

    // Charger les images attachées au post
    useEffect(() => {
        if (postId) {
            apiFetch({
                path: `/wp/v2/media?parent=${postId}&per_page=100&media_type=image`,
            }).then((media) => {
                const images = media.map(item => ({
                    id: item.id,
                    url: item.source_url,
                    alt: item.alt_text || '',
                    caption: (item.caption && (item.caption.raw || item.caption.rendered)) ? (item.caption.raw || item.caption.rendered) : ''
                }));
                setAttachments(images);
            });
        }
    }, [postId]);

    // Mettre à jour les slides quand la source change
    useEffect(() => {
        if (imageSource === 'post' && attachments && attachments.length > 0) {
            setAttributes({ slides: attachments });
        }
    }, [imageSource, attachments]);

    const onSelectImages = (images) => {
        const newSlides = images.map(image => ({
            id: image.id,
            url: image.url,
            alt: image.alt || '',
            caption: image?.caption?.raw || image?.caption?.rendered || ''
        }));
        setAttributes({ slides: newSlides });
        setMediaArray(newSlides);
    };

    // Convert current source (post/meta) to a custom gallery
    const handleConvertToGallery = async () => {
        try {
            let ids = [];
            if (imageSource === 'post') {
                ids = (attachments || []).map(a => a.id).filter(Boolean);
            } else if (imageSource === 'meta') {
                const raw = (postMeta && metaKey) ? postMeta[metaKey] : '';
                const str = Array.isArray(raw) ? raw.join(',') : (raw || '');
                ids = str.split(',').map(s => parseInt(String(s).trim(), 10)).filter(n => Number.isInteger(n) && n > 0);
            }
            if (!ids.length) {
                // nothing to convert
                return;
            }
            // fetch media objects for ids to get URLs/alt
            const uniqueIds = Array.from(new Set(ids));
            const chunks = [uniqueIds];
            // simple fetch (ids <= 100 per request typically)
            let media = [];
            for (const group of chunks) {
                const query = encodeURIComponent(group.join(','));
                const result = await apiFetch({ path: `/wp/v2/media?include=${query}&per_page=${group.length}` });
                media = media.concat(result);
            }
            // preserve order of ids
            const slidesFromIds = uniqueIds.map(id => {
                const m = media.find(item => item.id === id);
                return m ? { id: m.id, url: m.source_url, alt: m.alt_text || '', caption: (m.caption && (m.caption.raw || m.caption.rendered)) ? (m.caption.raw || m.caption.rendered) : '' } : null;
            }).filter(Boolean);
            if (!slidesFromIds.length) return;
            setAttributes({ imageSource: 'gallery', slides: slidesFromIds });
            setMediaArray(slidesFromIds);
        } catch (e) {
            // silent fail in editor
        }
    };

    const updateBreakpointSetting = (device, field, value) => {
        const newBreakpoints = JSON.parse(JSON.stringify(breakpoints)); // Deep clone
        newBreakpoints[device].settings[field] = value;
        setAttributes({ breakpoints: newBreakpoints });
    };

    // Définition des types de flèches disponibles
    const arrowTypes = [
        { label: __('Type 1', 'up-bk-slick-slider'), value: 'type1' },
        { label: __('Type 2', 'up-bk-slick-slider'), value: 'type2' },
        { label: __('Custom (CSS selectors)', 'up-bk-slick-slider'), value: 'custom' },
    ];

    // Définition des positions de flèches disponibles
    const arrowPositions = [
        { label: __('Center', 'up-bk-slick-slider'), value: 'center' },
        { label: __('Top Left', 'up-bk-slick-slider'), value: 'top-left' },
        { label: __('Top Right', 'up-bk-slick-slider'), value: 'top-right' },
        { label: __('Bottom Left', 'up-bk-slick-slider'), value: 'bottom-left' },
        { label: __('Bottom Right', 'up-bk-slick-slider'), value: 'bottom-right' },
        { label: __('Bottom Center', 'up-bk-slick-slider'), value: 'bottom-center' },
    ];

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__('Sources', 'up-bk-slick-slider')} initialOpen={true}>
                    <SelectControl
                        label={__('Image Source', 'up-bk-slick-slider')}
                        value={imageSource}
                        options={[
                            { label: __('Custom Gallery', 'up-bk-slick-slider'), value: 'gallery' },
                            { label: __('Post Images', 'up-bk-slick-slider'), value: 'post' },
                            { label: __('Meta (IDs CSV)', 'up-bk-slick-slider'), value: 'meta' },
                        ]}
                        onChange={(value) => setAttributes({ imageSource: value })}
                    />

                    {imageSource === 'gallery' && (
                        <MediaUploadCheck>
                            <MediaUpload
                                onSelect={onSelectImages}
                                allowedTypes={['image']}
                                multiple={true}
                                gallery={true}
                                value={slides.map(img => img.id)}
                                render={({ open }) => (
                                    <Button
                                        onClick={open}
                                        variant="primary"
                                        className="editor-post-featured-image__toggle"
                                    >
                                        {slides.length > 0
                                            ? __('Edit Gallery', 'up-bk-slick-slider')
                                            : __('Add Images', 'up-bk-slick-slider')}
                                    </Button>
                                )}
                            />
                        </MediaUploadCheck>
                    )}

                    {imageSource === 'post' && (
                        <>
                            {attachments && attachments.length > 0 ? (
                                <p>{__(`Using ${attachments.length} images uploaded to this post`, 'up-bk-slick-slider')}</p>
                            ) : (
                                <Notice status="info" isDismissible={false}>
                                    {__('No images uploaded to this post yet. Upload some images using the media library.', 'up-bk-slick-slider')}
                                </Notice>
                            )}
                        </>
                    )}

                    {imageSource === 'meta' && (
                        <TextControl
                            label={__('Meta key (slug)', 'up-bk-slick-slider')}
                            help={__('Enter a post meta key containing a comma-separated list of image IDs, e.g., "123,456,789". Each number must be a valid attachment ID.', 'up-bk-slick-slider')}
                            value={metaKey || ''}
                            onChange={(value) => setAttributes({ metaKey: value })}
                            placeholder="_my_image_ids"
                        />
                    )}

                    {(imageSource === 'meta' || imageSource === 'post') && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={handleConvertToGallery}
                                style={{ marginTop: '10px' }}
                            >
                                {__('Convertir en Custom Gallery', 'up-bk-slick-slider')}
                            </Button>
                            <Notice status="info" isDismissible={false}>
                                {__('Astuce: la valeur des images (meta ou images du post) est lue au chargement de l’éditeur. Si vous modifiez la meta sur cette page, enregistrez la page puis rechargez l’éditeur avant d’utiliser la conversion.', 'up-bk-slick-slider')}
                            </Notice>
                        </>
                    )}
                </PanelBody>

                <PanelBody title={__('Image Display', 'up-bk-slick-slider')} initialOpen={false}>
                    <SelectControl
                        label={__('Image Size', 'up-bk-slick-slider')}
                        value={imageSize || 'full'}
                        options={[
                            { label: 'Full', value: 'full' },
                            { label: 'Large', value: 'large' },
                            { label: 'Medium Large', value: 'medium_large' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'Thumbnail', value: 'thumbnail' },
                        ]}
                        onChange={(value) => setAttributes({ imageSize: value })}
                        help={__('Choose the registered WordPress image size to output', 'up-bk-slick-slider')}
                    />
                    <SelectControl
                        label={__('Aspect Ratio', 'up-bk-slick-slider')}
                        value={aspectRatio}
                        options={[
                            { label: __('Auto', 'up-bk-slick-slider'), value: 'auto' },
                            { label: '1:1', value: '1/1' },
                            { label: '2:1', value: '2/1' },
                            { label: '1:2', value: '1/2' },
                            { label: '4:3', value: '4/3' },
                            { label: '3:4', value: '3/4' },
                            { label: '3:2', value: '3/2' },
                            { label: '2:3', value: '2/3' },
                            { label: '5:4', value: '5/4' },
                            { label: '4:5', value: '4/5' },
                            { label: '16:9', value: '16/9' },
                            { label: '9:16', value: '9/16' },
                            { label: '21:9', value: '21/9' },
                        ]}
                        onChange={(value) => setAttributes({ aspectRatio: value })}
                    />
                    <SelectControl
                        label={__('Object Fit', 'up-bk-slick-slider')}
                        value={objectFit}
                        options={[
                            { label: __('Cover - Fill the space', 'up-bk-slick-slider'), value: 'cover' },
                            { label: __('Contain - Show entire image', 'up-bk-slick-slider'), value: 'contain' },
                        ]}
                        onChange={(value) => setAttributes({ objectFit: value })}
                    />
                    <ToggleControl
                        label={__('Show Figcaption', 'up-bk-slick-slider')}
                        checked={!!showFigcaption}
                        onChange={(value) => setAttributes({ showFigcaption: value })}
                    />
                </PanelBody>

                <PanelBody title={__('Slider Settings', 'up-bk-slick-slider')} initialOpen={false}>
                    <ToggleControl
                        label={__('Autoplay', 'up-bk-slick-slider')}
                        checked={autoplay}
                        onChange={(value) => setAttributes({ autoplay: value })}
                    />
                    {autoplay && (
                        <RangeControl
                            label={__('Autoplay Speed (ms)', 'up-bk-slick-slider')}
                            value={autoplaySpeed}
                            onChange={(value) => setAttributes({ autoplaySpeed: value })}
                            min={1000}
                            max={10000}
                            step={500}
                        />
                    )}

                    <RangeControl
                        label={__('Animation Speed (ms)', 'up-bk-slick-slider')}
                        value={speed}
                        onChange={(value) => setAttributes({ speed: value })}
                        min={100}
                        max={3000}
                        step={100}
                    />
                    <ToggleControl
                        label={__('Infinite Loop', 'up-bk-slick-slider')}
                        checked={infinite}
                        onChange={(value) => setAttributes({ infinite: value })}
                    />
                    <ToggleControl
                        label={__('Show Arrows', 'up-bk-slick-slider')}
                        checked={arrows}
                        onChange={(value) => setAttributes({ arrows: value })}
                    />
                    <ToggleControl
                        label={__('Show Dots', 'up-bk-slick-slider')}
                        checked={dots}
                        onChange={(value) => setAttributes({ dots: value })}
                    />
                    <ToggleControl
                        label={__('Fade Effect', 'up-bk-slick-slider')}
                        checked={fade}
                        onChange={(value) => setAttributes({ fade: value })}
                    />
                    <ToggleControl
                        label={__('Center Mode', 'up-bk-slick-slider')}
                        checked={centerMode}
                        onChange={(value) => setAttributes({ centerMode: value })}
                    />

                    <ToggleControl
                        label={__('Adaptive Height', 'up-bk-slick-slider')}
                        checked={adaptiveHeight}
                        onChange={(value) => setAttributes({ adaptiveHeight: value })}
                    />
                    <ToggleControl
                        label={__('Pause on Hover', 'up-bk-slick-slider')}
                        checked={pauseOnHover}
                        onChange={(value) => setAttributes({ pauseOnHover: value })}
                    />
                    <ToggleControl
                        label={__('Enable Swipe', 'up-bk-slick-slider')}
                        checked={swipe}
                        onChange={(value) => setAttributes({ swipe: value })}
                    />
                </PanelBody>

                <PanelBody title={__('Advanced Settings', 'up-bk-slick-slider')} initialOpen={false}>
                    <RangeControl
                        label={__('Slides to Show', 'up-bk-slick-slider')}
                        value={slidesToShow}
                        onChange={(value) => setAttributes({ slidesToShow: value })}
                        min={1}
                        max={8}
                        step={1}
                    />
                    <RangeControl
                        label={__('Slides to Scroll', 'up-bk-slick-slider')}
                        value={slidesToScroll}
                        onChange={(value) => setAttributes({ slidesToScroll: value })}
                        min={1}
                        max={8}
                        step={1}
                    />
                    <RangeControl
                        label={__('Gap between slides', 'up-bk-slick-slider')}
                        value={gap}
                        onChange={(value) => setAttributes({ gap: value })}
                        min={0}
                        max={300}
                        step={1}
                    />
                    
                    <ToggleControl
                        label={__('Fixed Height', 'up-bk-slick-slider')}
                        help={__('Enable to set a fixed height for all slides', 'up-bk-slick-slider')}
                        checked={fixedHeight}
                        onChange={(value) => setAttributes({ fixedHeight: value })}
                    />
                    {fixedHeight && (
                        <div style={{
                            backgroundColor: '#f5f5f5',
                            padding: '16px',
                            borderRadius: '4px',
                            marginBottom: '16px'
                        }}>
                            <TextControl
                                label={__('Slide Height', 'up-bk-slick-slider')}
                                help={__('Enter a value with unit (e.g., 400px, 50vh, etc.)', 'up-bk-slick-slider')}
                                value={slideHeight}
                                onChange={(value) => setAttributes({ slideHeight: value })}
                                placeholder="400px"
                            />
                            <ToggleControl
                                label={__('Variable Width', 'up-bk-slick-slider')}
                                help={__('Enable to allow slides to have variable widths. Useful for content with different sizes.', 'up-bk-slick-slider')}
                                checked={variableWidth}
                                onChange={(value) => setAttributes({ variableWidth: value })}
                            />
                            {!variableWidth && (
                                <SelectControl
                                    label={__('Image Fit', 'up-bk-slick-slider')}
                                    value={objectFit}
                                    options={[
                                        { label: __('Cover - Fill the space', 'up-bk-slick-slider'), value: 'cover' },
                                        { label: __('Contain - Show entire image', 'up-bk-slick-slider'), value: 'contain' },
                                    ]}
                                    onChange={(value) => setAttributes({ objectFit: value })}
                                    help={__('Choose how the image should fit within the slide', 'up-bk-slick-slider')}
                                />
                            )}
                        </div>
                    )}

                </PanelBody>

                <PanelBody title={__('Responsive Settings', 'up-bk-slick-slider')} initialOpen={false}>
                    <ToggleControl
                        label={__('Enable Responsive Mode', 'up-bk-slick-slider')}
                        checked={responsive}
                        onChange={(value) => setAttributes({ responsive: value })}
                    />

                    {responsive && (
                        <>
                            <PanelBody 
                                title={__('Tablet Settings (≤ 1024px)', 'up-bk-slick-slider')} 
                                initialOpen={tabletPanelOpen}
                                onToggle={() => setTabletPanelOpen(!tabletPanelOpen)}
                            >
                                <ToggleControl
                                    label={__('Fixed Height', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.fixedHeight}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'fixedHeight', value)}
                                />
                                {breakpoints.tablet.settings.fixedHeight && (
                                    <TextControl
                                        label={__('Slide Height', 'up-bk-slick-slider')}
                                        value={breakpoints.tablet.settings.slideHeight}
                                        onChange={(value) => updateBreakpointSetting('tablet', 'slideHeight', value)}
                                        help={__('Enter height with units (e.g., 400px, 50vh, var(--my-height))', 'up-bk-slick-slider')}
                                    />
                                )}
                                <SelectControl
                                    label={__('Object Fit', 'up-bk-slick-slider')}
                                    value={breakpoints.tablet.settings.objectFit}
                                    options={[
                                        { label: 'Cover', value: 'cover' },
                                        { label: 'Contain', value: 'contain' },
                                        { label: 'Fill', value: 'fill' },
                                        { label: 'None', value: 'none' },
                                    ]}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'objectFit', value)}
                                />
                                <RangeControl
                                    label={__('Gap between slides (px)', 'up-bk-slick-slider')}
                                    value={breakpoints.tablet.settings.gap}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'gap', value)}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
                                <RangeControl
                                    label={__('Slides to Show', 'up-bk-slick-slider')}
                                    value={breakpoints.tablet.settings.slidesToShow}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'slidesToShow', value)}
                                    min={1}
                                    max={10}
                                />
                                <RangeControl
                                    label={__('Slides to Scroll', 'up-bk-slick-slider')}
                                    value={breakpoints.tablet.settings.slidesToScroll}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'slidesToScroll', value)}
                                    min={1}
                                    max={10}
                                />
                                <ToggleControl
                                    label={__('Show Arrows', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.arrows}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'arrows', value)}
                                />
                                <ToggleControl
                                    label={__('Show Dots', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.dots}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'dots', value)}
                                />
                                <ToggleControl
                                    label={__('Autoplay', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.autoplay}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'autoplay', value)}
                                />
                                {breakpoints.tablet.settings.autoplay && (
                                    <RangeControl
                                        label={__('Autoplay Speed (ms)', 'up-bk-slick-slider')}
                                        value={breakpoints.tablet.settings.autoplaySpeed}
                                        onChange={(value) => updateBreakpointSetting('tablet', 'autoplaySpeed', value)}
                                        min={1000}
                                        max={10000}
                                        step={500}
                                    />
                                )}
                                <ToggleControl
                                    label={__('Infinite Loop', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.infinite}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'infinite', value)}
                                />
                                <RangeControl
                                    label={__('Animation Speed (ms)', 'up-bk-slick-slider')}
                                    value={breakpoints.tablet.settings.speed}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'speed', value)}
                                    min={100}
                                    max={3000}
                                    step={100}
                                />
                                <ToggleControl
                                    label={__('Fade Effect', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.fade}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'fade', value)}
                                />
                                <ToggleControl
                                    label={__('Center Mode', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.centerMode}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'centerMode', value)}
                                />
                                <ToggleControl
                                    label={__('Adaptive Height', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.adaptiveHeight}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'adaptiveHeight', value)}
                                />
                                <ToggleControl
                                    label={__('Pause on Hover', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.pauseOnHover}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'pauseOnHover', value)}
                                />
                                <ToggleControl
                                    label={__('Enable Swipe', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.swipe}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'swipe', value)}
                                />
                                <ToggleControl
                                    label={__('Variable Width', 'up-bk-slick-slider')}
                                    checked={breakpoints.tablet.settings.variableWidth}
                                    onChange={(value) => updateBreakpointSetting('tablet', 'variableWidth', value)}
                                />
                            </PanelBody>

                            <PanelBody 
                                title={__('Mobile Settings (≤ 480px)', 'up-bk-slick-slider')} 
                                initialOpen={mobilePanelOpen}
                                onToggle={() => setMobilePanelOpen(!mobilePanelOpen)}
                            >
                                <ToggleControl
                                    label={__('Fixed Height', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.fixedHeight}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'fixedHeight', value)}
                                />
                                {breakpoints.mobile.settings.fixedHeight && (
                                    <TextControl
                                        label={__('Slide Height', 'up-bk-slick-slider')}
                                        value={breakpoints.mobile.settings.slideHeight}
                                        onChange={(value) => updateBreakpointSetting('mobile', 'slideHeight', value)}
                                        help={__('Enter height with units (e.g., 400px, 50vh, var(--my-height))', 'up-bk-slick-slider')}
                                    />
                                )}
                                <SelectControl
                                    label={__('Object Fit', 'up-bk-slick-slider')}
                                    value={breakpoints.mobile.settings.objectFit}
                                    options={[
                                        { label: 'Cover', value: 'cover' },
                                        { label: 'Contain', value: 'contain' },
                                        { label: 'Fill', value: 'fill' },
                                        { label: 'None', value: 'none' },
                                    ]}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'objectFit', value)}
                                />
                                <RangeControl
                                    label={__('Gap between slides (px)', 'up-bk-slick-slider')}
                                    value={breakpoints.mobile.settings.gap}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'gap', value)}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
                                <RangeControl
                                    label={__('Slides to Show', 'up-bk-slick-slider')}
                                    value={breakpoints.mobile.settings.slidesToShow}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'slidesToShow', value)}
                                    min={1}
                                    max={10}
                                />
                                <RangeControl
                                    label={__('Slides to Scroll', 'up-bk-slick-slider')}
                                    value={breakpoints.mobile.settings.slidesToScroll}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'slidesToScroll', value)}
                                    min={1}
                                    max={10}
                                />
                                <ToggleControl
                                    label={__('Show Arrows', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.arrows}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'arrows', value)}
                                />
                                <ToggleControl
                                    label={__('Show Dots', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.dots}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'dots', value)}
                                />
                                <ToggleControl
                                    label={__('Autoplay', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.autoplay}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'autoplay', value)}
                                />
                                {breakpoints.mobile.settings.autoplay && (
                                    <RangeControl
                                        label={__('Autoplay Speed (ms)', 'up-bk-slick-slider')}
                                        value={breakpoints.mobile.settings.autoplaySpeed}
                                        onChange={(value) => updateBreakpointSetting('mobile', 'autoplaySpeed', value)}
                                        min={1000}
                                        max={10000}
                                        step={500}
                                    />
                                )}
                                <ToggleControl
                                    label={__('Infinite Loop', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.infinite}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'infinite', value)}
                                />
                                <RangeControl
                                    label={__('Animation Speed (ms)', 'up-bk-slick-slider')}
                                    value={breakpoints.mobile.settings.speed}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'speed', value)}
                                    min={100}
                                    max={3000}
                                    step={100}
                                />
                                <ToggleControl
                                    label={__('Fade Effect', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.fade}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'fade', value)}
                                />
                                <ToggleControl
                                    label={__('Center Mode', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.centerMode}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'centerMode', value)}
                                />
                                <ToggleControl
                                    label={__('Adaptive Height', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.adaptiveHeight}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'adaptiveHeight', value)}
                                />
                                <ToggleControl
                                    label={__('Pause on Hover', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.pauseOnHover}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'pauseOnHover', value)}
                                />
                                <ToggleControl
                                    label={__('Enable Swipe', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.swipe}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'swipe', value)}
                                />
                                <ToggleControl
                                    label={__('Variable Width', 'up-bk-slick-slider')}
                                    checked={breakpoints.mobile.settings.variableWidth}
                                    onChange={(value) => updateBreakpointSetting('mobile', 'variableWidth', value)}
                                />
                            </PanelBody>
                        </>
                    )}
                </PanelBody>
                <PanelBody 
                    title={__('Navigation Settings', 'up-bk-slick-slider')}
                    initialOpen={false}
                >
                    <ToggleControl
                        label={__('Show arrows', 'up-bk-slick-slider')}
                        checked={arrows}
                        onChange={(value) => setAttributes({ arrows: value })}
                    />
                    <ToggleControl
                        label={__('Auto-hide arrows when all slides are visible', 'up-bk-slick-slider')}
                        checked={!!autoHideArrows}
                        onChange={(value) => setAttributes({ autoHideArrows: value })}
                        help={__('If total slides ≤ slides to show (including per breakpoint), hide arrows automatically.', 'up-bk-slick-slider')}
                    />
                    {arrows && (
                        <>
                            <SelectControl
                                label={__('Arrow Type', 'up-bk-slick-slider')}
                                value={arrowType}
                                options={arrowTypes}
                                onChange={(value) => setAttributes({ arrowType: value })}
                            />
                            <SelectControl
                                label={__('Arrow Position', 'up-bk-slick-slider')}
                                value={arrowPosition}
                                options={arrowPositions}
                                onChange={(value) => setAttributes({ arrowPosition: value })}
                            />
                            {arrowType === 'custom' && (
                                <>
                                    <TextControl
                                        label={__('Custom Prev CSS selector or class (e.g. .my-prev)', 'up-bk-slick-slider')}
                                        value={attributes.customPrevClass || ''}
                                        onChange={(value) => setAttributes({ customPrevClass: value })}
                                        placeholder=".my-prev"
                                        help={__('Selector must match an element present in the page.', 'up-bk-slick-slider')}
                                    />
                                    <TextControl
                                        label={__('Custom Next CSS selector or class (e.g. .my-next)', 'up-bk-slick-slider')}
                                        value={attributes.customNextClass || ''}
                                        onChange={(value) => setAttributes({ customNextClass: value })}
                                        placeholder=".my-next"
                                        help={__('Selector must match an element present in the page.', 'up-bk-slick-slider')}
                                    />
                                </>
                            )}
                            <RangeControl
                                label={__('Icon Size (rem)', 'up-bk-slick-slider')}
                                value={parseFloat(navIconSize)}
                                onChange={(value) => setAttributes({ navIconSize: `${value}rem` })}
                                min={0.5}
                                max={5}
                                step={0.1}
                            />
                            <RangeControl
                                label={__('Gap (em)', 'up-bk-slick-slider')}
                                value={navGap}
                                onChange={(value) => setAttributes({ navGap: value })}
                                min={0}
                                max={5}
                                step={0.1}
                            />
                            <RangeControl
                                label={__('Border Radius (rem)', 'up-bk-slick-slider')}
                                value={parseFloat(navRadius)}
                                onChange={(value) => setAttributes({ navRadius: `${value}rem` })}
                                min={0}
                                max={5}
                                step={0.1}
                            />
                            <RangeControl
                                label={__('Padding (em)', 'up-bk-slick-slider')}
                                value={navPadding}
                                onChange={(value) => setAttributes({ navPadding: value })}
                                min={0}
                                max={3}
                                step={0.1}
                            />
                        </>
                    )}
                    <ToggleControl
                        label={__('Show dots', 'up-bk-slick-slider')}
                        checked={dots}
                        onChange={(value) => setAttributes({ dots: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <div 
                {...blockProps}
                className={`wp-block-up-bk-slick-slider-editor${blockProps.className ? ' ' + blockProps.className : ''}`}
                data-arrow-position={arrowPosition}
                style={{
                    '--nav-icon-size': navIconSize,
                    '--nav-gap': `${navGap}em`,
                    '--nav-radius': navRadius,
                    '--nav-padding': `${navPadding}em`,
                    '--slide-gap': `${gap}px`,
                    ...blockProps.style
                }}
            >
                <div className="slider-preview">
                    {imageSource === 'gallery' ? (
                        mediaArray.length === 0 ? (
                            <MediaPlaceholder
                                icon="format-gallery"
                                labels={{
                                    title: __('Gallery', 'up-bk-slick-slider'),
                                    instructions: __('Drag images, upload new ones or select files from your library.', 'up-bk-slick-slider'),
                                }}
                                onSelect={onSelectImages}
                                accept="image/*"
                                allowedTypes={ALLOWED_MEDIA_TYPES}
                                multiple
                                value={mediaArray}
                            />
                        ) : (
                            <>
                                <div className="slider-preview-items" style={{ 
                                    display: 'flex',
                                    gap: 'var(--slide-gap)',
                                    margin: '0 10px',
                                    overflow: 'hidden'
                                }}>
                                    {Array.from({ length: Math.max(1, slidesToShow) + 1 }).map((_, idx) => {
                                        const absIndex = (startIndex + idx) % mediaArray.length;
                                        const img = mediaArray[absIndex];
                                        return (
                                            <div key={(img && (img.id || img.url)) || idx} className="slider-preview-item" style={{
                                                aspectRatio: fixedHeight ? 'auto' : (aspectRatio && aspectRatio !== 'auto' ? aspectRatio.replace('/', ' / ') : '16/9'),
                                                height: fixedHeight ? slideHeight : 'auto',
                                                width: `calc((100% - (var(--slide-gap) * ${Math.max(0, slidesToShow - 1)})) / ${Math.max(1, slidesToShow)})`,
                                                flex: '0 0 auto'
                                            }}>
                                                {img && (
                                                    <>
                                                        <img
                                                            src={img.url}
                                                            alt={img.alt}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: objectFit
                                                            }}
                                                        />
                                                        {showFigcaption && (
                                                            <RichText
                                                                tagName="figcaption"
                                                                placeholder={__('Write caption…', 'up-bk-slick-slider')}
                                                                value={img.caption || ''}
                                                                onChange={(value) => {
                                                                    const newSlides = [...(slides || [])];
                                                                    const newMedia = [...(mediaArray || [])];
                                                                    if (newSlides[absIndex]) newSlides[absIndex] = { ...newSlides[absIndex], caption: value };
                                                                    if (newMedia[absIndex]) newMedia[absIndex] = { ...newMedia[absIndex], caption: value };
                                                                    setAttributes({ slides: newSlides });
                                                                    setMediaArray(newMedia);
                                                                    if (img.id) {
                                                                        saveCaptionToMedia(img.id, value);
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                <MediaUploadCheck>
                                    <MediaUpload
                                        onSelect={onSelectImages}
                                        allowedTypes={ALLOWED_MEDIA_TYPES}
                                        multiple
                                        gallery
                                        value={mediaArray.map(img => img.id).filter(Boolean)}
                                        render={({ open }) => (
                                            <Button
                                                className="edit-gallery-button"
                                                onClick={open}
                                            >
                                                {__('Edit gallery', 'up-bk-slick-slider')}
                                            </Button>
                                        )}
                                    />
                                </MediaUploadCheck>
                            </>
                        )
                    ) : (
                        // Placeholder preview for meta/post sources
                        <div className="slider-preview-items" style={{ 
                            display: 'flex',
                            gap: 'var(--slide-gap)',
                            margin: '0 10px',
                            overflow: 'hidden'
                        }}>
                            {Array.from({ length: Math.max(1, slidesToShow) + 1 }).map((_, idx) => (
                                <div key={idx} className="slider-preview-item" style={{
                                    position: 'relative',
                                    background: '#f3f4f6',
                                    border: '1px dashed #cbd5e1',
                                    color: '#334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: '8px',
                                    aspectRatio: fixedHeight ? 'auto' : (aspectRatio && aspectRatio !== 'auto' ? aspectRatio.replace('/', ' / ') : '16/9'),
                                    height: fixedHeight ? slideHeight : 'auto',
                                    width: `calc((100% - (var(--slide-gap) * ${Math.max(0, slidesToShow - 1)})) / ${Math.max(1, slidesToShow)})`,
                                    flex: '0 0 auto'
                                }}>
                                    <div style={{ pointerEvents: 'none' }}>
                                        {imageSource === 'meta' ? (
                                            <>
                                                <strong>{__('Afficher la galerie :', 'up-bk-slick-slider')}</strong>
                                                <div>{metaKey ? metaKey : __('(meta non définie)', 'up-bk-slick-slider')}</div>
                                            </>
                                        ) : (
                                            <strong>{__('Afficher les images téléversées sur le post', 'up-bk-slick-slider')}</strong>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {imageSource !== 'gallery' && (
                        <Button
                            variant="secondary"
                            onClick={handleConvertToGallery}
                            style={{ marginTop: '10px' }}
                        >
                            {__('Convertir en Custom Gallery', 'up-bk-slick-slider')}
                        </Button>
                    )}

                    {arrows && (
                        <div className="wp-block-up-bk-slick-slider__nav">
                            <div 
                                className="wp-block-up-bk-slick-slider__nav__arrow wp-block-up-bk-slick-slider__nav__arrow--prev"
                                onClick={handlePrevClick}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M14.6 7.4L10 12l4.6 4.6L13.2 18l-6-6 6-6z"/>
                                </svg>
                            </div>
                            <div 
                                className="wp-block-up-bk-slick-slider__nav__arrow wp-block-up-bk-slick-slider__nav__arrow--next"
                                onClick={handleNextClick}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                    <path d="M9.4 18L8 16.6l4.6-4.6L8 7.4 9.4 6l6 6z"/>
                                </svg>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
