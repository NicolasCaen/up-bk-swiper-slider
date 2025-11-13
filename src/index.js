import { registerBlockType, createBlock } from '@wordpress/blocks';
import Edit from './edit';
import metadata from '../block.json';
import './editor.scss';
import './view.js';
import './style.scss';

registerBlockType(metadata.name, {
    ...metadata,
    edit: Edit,
    save: () => null,
    transforms: {
        from: [
            {
                type: 'block',
                blocks: ['core/gallery'],
                transform: (attributes = {}, innerBlocks = []) => {
                    let images = [];
                    if (Array.isArray(innerBlocks) && innerBlocks.length) {
                        images = innerBlocks
                            .filter((b) => b.name === 'core/image')
                            .map((b) => ({
                                id: b.attributes.id,
                                url: b.attributes.url,
                                alt: b.attributes.alt || '',
                                caption: b.attributes.caption || ''
                            }))
                            .filter((img) => img.url);
                    } else if (Array.isArray(attributes.images)) {
                        images = attributes.images
                            .map((img) => ({
                                id: img.id,
                                url: img.url,
                                alt: img.alt || '',
                                caption: img.caption || ''
                            }))
                            .filter((img) => img.url);
                    }
                    return createBlock(metadata.name, {
                        imageSource: 'gallery',
                        slides: images
                    });
                },
            },
        ],
        to: [
            {
                type: 'block',
                blocks: ['core/gallery'],
                transform: ({ slides = [] }) => {
                    const innerBlocks = (slides || [])
                        .filter((s) => s && s.url)
                        .map((s) =>
                            createBlock('core/image', {
                                id: s.id,
                                url: s.url,
                                alt: s.alt || '',
                                caption: s.caption || ''
                            })
                        );
                    return createBlock('core/gallery', {}, innerBlocks);
                },
            },
        ],
    },
});
