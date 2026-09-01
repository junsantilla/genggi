const MASONRY_IMAGES = [
    "/images/layouts/1.webp",
    "/images/layouts/2.png",
    "/images/layouts/3.png",
];

const MASONRY_IMAGE_COUNT = 12;

export default function MasonryBackground() {
    return (
        <div
            className="auth-masonry pointer-events-none absolute inset-0 h-[150px] overflow-hidden columns-2 gap-2 p-2 sm:columns-4 lg:columns-6 mt-2"
            aria-hidden="true"
        >
            {Array.from({ length: MASONRY_IMAGE_COUNT }, (_, index) => {
                const src = MASONRY_IMAGES[index % MASONRY_IMAGES.length];

                return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={`${src}-${index}`}
                        src={src}
                        alt=""
                        className="auth-masonry-image mb-2 block w-full break-inside-avoid"
                    />
                );
            })}
        </div>
    );
}
