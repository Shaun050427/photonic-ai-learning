import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "experiments"))
from foundations import angular_spectrum, phase_mask  # noqa: E402


class PropagationTests(unittest.TestCase):
    def test_zero_distance_and_energy_for_propagating_spectrum(self):
        rng = np.random.default_rng(42)
        field = rng.normal(size=(32, 40)) + 1j * rng.normal(size=(32, 40))
        wavelength, dx = 532e-9, 10e-6  # all sampled frequencies propagate
        np.testing.assert_allclose(angular_spectrum(field, wavelength, dx, 0), field, atol=1e-13)
        out = angular_spectrum(field, wavelength, dx, 0.02)
        np.testing.assert_allclose(np.sum(abs(out) ** 2), np.sum(abs(field) ** 2), rtol=1e-12)

    def test_phase_mask_preserves_pointwise_intensity(self):
        rng = np.random.default_rng(7)
        field = rng.normal(size=(16, 16)) + 1j * rng.normal(size=(16, 16))
        phase = rng.uniform(-np.pi, np.pi, field.shape)
        np.testing.assert_allclose(abs(phase_mask(field, phase)) ** 2, abs(field) ** 2, atol=1e-14)


if __name__ == "__main__":
    unittest.main()
