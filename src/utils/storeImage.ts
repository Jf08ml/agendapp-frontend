// Miniatura optimizada vía transformaciones de ImageKit (encaja en 600×600 sin
// recortar; el recorte visual final lo hace el CSS del contenedor). Si la URL
// ya trae parámetros o no es de ImageKit, se usa tal cual.
export const storeImageSrc = (url: string) =>
  url.includes("ik.imagekit.io") && !url.includes("?")
    ? `${url}?tr=w-600,h-600,c-at_max`
    : url;
