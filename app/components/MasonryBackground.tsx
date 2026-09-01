const MASONRY_IMAGES = [
    "/images/layouts/1.webp",
    "/images/layouts/2.png",
    "/images/layouts/3.png",
    "/images/layouts/11.png",
    "/images/layouts/5.png",
    "/images/layouts/6.png",
    "/images/layouts/7.png",
    "/images/layouts/8.png",
    "/images/layouts/14.png",
    "/images/layouts/4.png",
    "/images/layouts/10.webp",
    "/images/layouts/12.png",
    "/images/layouts/13.png",
    "/images/layouts/9.webp",
    "/images/layouts/15.png",
    "/images/layouts/16.png",
    "/images/layouts/17.png",
    "/images/layouts/18.png",
    "/images/layouts/19.png",
    "/images/layouts/20.png",
];

const MASONRY_IMAGE_COUNT = 40;

export default function MasonryBackground() {
    return (
        <div
            className="auth-masonry pointer-events-none absolute inset-0 overflow-hidden p-2"
            aria-hidden="true"
        >
            <div className="auth-masonry-inner flex h-full w-full gap-2">
                {Array.from({ length: 6 }, (_, col) => (
                    <div
                        key={col}
                        className="auth-masonry-column flex h-full flex-1 flex-col gap-2"
                    >
                        {Array.from(
                            { length: Math.ceil(MASONRY_IMAGE_COUNT / 6) },
                            (_, i) => {
                                const index = col + i * 6;
                                if (index >= MASONRY_IMAGE_COUNT) return null;
                                const src =
                                    MASONRY_IMAGES[
                                        index % MASONRY_IMAGES.length
                                    ];

                                return (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={`${src}-${index}`}
                                        src={src}
                                        alt=""
                                        className="auth-masonry-image block w-full"
                                    />
                                );
                            },
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
