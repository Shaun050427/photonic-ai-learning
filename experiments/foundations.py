"""Five reproducible Fourier optics experiments for the first learning stage."""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


def angular_spectrum(field: np.ndarray, wavelength: float, dx: float, z: float) -> np.ndarray:
    """Propagate a sampled scalar field; FFT implies a periodic finite window."""
    if field.ndim != 2 or min(field.shape) < 2:
        raise ValueError("field must be a two-dimensional array")
    if wavelength <= 0 or dx <= 0 or z < 0:
        raise ValueError("wavelength and dx must be positive; z must be nonnegative")
    fy = np.fft.fftfreq(field.shape[0], d=dx)
    fx = np.fft.fftfreq(field.shape[1], d=dx)
    FX, FY = np.meshgrid(fx, fy)
    k = 2 * np.pi / wavelength
    kz = np.sqrt((k * k - (2 * np.pi * FX) ** 2 - (2 * np.pi * FY) ** 2).astype(complex))
    transfer = np.exp(1j * kz * z)
    return np.fft.ifft2(np.fft.fft2(field) * transfer)


def phase_mask(field: np.ndarray, phase: np.ndarray) -> np.ndarray:
    if field.shape != phase.shape:
        raise ValueError("phase shape must match field shape")
    return field * np.exp(1j * phase)


def low_pass(field: np.ndarray, cutoff: float, dx: float) -> np.ndarray:
    """Digital analogue of coherent 4f spatial filtering; cutoff is in cycles/m."""
    if cutoff <= 0 or dx <= 0:
        raise ValueError("cutoff and dx must be positive")
    fy = np.fft.fftfreq(field.shape[0], d=dx)
    fx = np.fft.fftfreq(field.shape[1], d=dx)
    FX, FY = np.meshgrid(fx, fy)
    transfer = (FX * FX + FY * FY) <= cutoff * cutoff
    return np.fft.ifft2(np.fft.fft2(field) * transfer)


def save_image(image: np.ndarray, title: str, filename: Path, extent: tuple[float, ...] | None = None) -> None:
    fig, ax = plt.subplots(figsize=(6, 5))
    picture = ax.imshow(image, cmap="magma", origin="lower", extent=extent)
    ax.set_title(title)
    if extent is not None:
        ax.set_xlabel("x (mm)")
        ax.set_ylabel("y (mm)")
    fig.colorbar(picture, ax=ax, label="relative intensity (a.u.)")
    fig.tight_layout()
    fig.savefig(filename, dpi=160)
    plt.close(fig)


def run(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    n, dx, wavelength, z = 512, 10e-6, 532e-9, 0.1
    x = (np.arange(n) - n // 2) * dx
    X, Y = np.meshgrid(x, x)
    extent = (x[0] * 1e3, x[-1] * 1e3, x[0] * 1e3, x[-1] * 1e3)
    gaussian = np.exp(-(X * X + Y * Y) / (0.5e-3) ** 2)

    save_image(np.abs(gaussian) ** 2, "01 · Gaussian input", output / "01_field.png", extent)
    propagated = angular_spectrum(gaussian, wavelength, dx, z)
    save_image(np.abs(propagated) ** 2, "02 · Angular spectrum propagation", output / "02_propagation.png", extent)

    rng = np.random.default_rng(2026)
    modulated = phase_mask(gaussian, rng.uniform(0, 2 * np.pi, gaussian.shape))
    after_mask = angular_spectrum(modulated, wavelength, dx, z)
    save_image(np.abs(after_mask) ** 2, "03 · Phase mask and propagation", output / "03_phase_mask.png", extent)

    aperture = ((np.abs(X) < 0.25e-3) & (np.abs(Y) < 0.25e-3)).astype(float)
    spectrum = np.fft.fftshift(np.fft.fft2(aperture))
    crop = slice(n // 2 - 80, n // 2 + 80)
    save_image(np.log1p(np.abs(spectrum[crop, crop]) ** 2), "04 · Square aperture far field (log scale)", output / "04_diffraction.png")

    filtered = low_pass(aperture, cutoff=40 / (n * dx), dx=dx)
    save_image(np.abs(filtered) ** 2, "05 · Coherent low-pass filter", output / "05_low_pass.png", extent)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("results"))
    run(parser.parse_args().output)
