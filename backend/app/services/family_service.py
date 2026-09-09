import random
import logging
from typing import Dict, List, Optional
from datetime import datetime
from app.models.schemas import FamilyAccount, ElderProfile, FamilyRegistrationRequest

logger = logging.getLogger("annien.family")


class FamilyService:
    """
    Manages multi-tenant family accounts, pairing codes, and elder profiles.
    Each family has its own isolated records (medications, memories, SOS logs, moods).
    """

    def __init__(self):
        self._families: Dict[str, FamilyAccount] = {}
        self._pairing_map: Dict[str, str] = {}  # pairing_code -> family_id
        self._seed_default_family()

    def _generate_pairing_code(self) -> str:
        """Generates an easy-to-remember pairing code, e.g. 'ANN-8866'"""
        while True:
            code = f"ANN-{random.randint(1000, 9999)}"
            if code not in self._pairing_map:
                return code

    def _seed_default_family(self):
        """Initializes default pre-configured family for instant demo"""
        fam_id = "fam_default"
        pairing_code = "ANN-8866"

        elder = ElderProfile(
            id="elder_default",
            family_id=fam_id,
            full_name="Nguyễn Văn An",
            preferred_name="Bác An",
            honorific="Bác",
            birth_year=1948,
            address="128 Lê Lợi, TP. Bến Tre",
            primary_caregiver_phone="0912345678",
            medical_notes="Huyết áp cao độ 1, tiền sử thoái hóa khớp gối nhẹ",
            ai_name="An Nhiên"
        )

        fam = FamilyAccount(
            id=fam_id,
            username="giadinh_bacan",
            password="123456",
            family_name="Gia Đình Bác Nguyễn Văn An",
            admin_phone="0912345678",
            pairing_code=pairing_code,
            created_at=datetime.utcnow().isoformat(),
            elder=elder
        )

        self._families[fam_id] = fam
        self._pairing_map[pairing_code] = fam_id
        logger.info(f"Default family seeded: user 'giadinh_bacan' / pairing code {pairing_code}")

    def get_family(self, family_id: str) -> Optional[FamilyAccount]:
        return self._families.get(family_id)

    def get_family_by_code(self, pairing_code: str) -> Optional[FamilyAccount]:
        fam_id = self._pairing_map.get(pairing_code.strip().upper())
        if fam_id:
            return self._families.get(fam_id)
        return None

    def login_family(self, login_req_or_identifier, password: Optional[str] = None) -> Optional[FamilyAccount]:
        username = ""
        pwd = password

        if isinstance(login_req_or_identifier, str):
            username = login_req_or_identifier.strip()
        elif hasattr(login_req_or_identifier, "username") or hasattr(login_req_or_identifier, "identifier"):
            username = (login_req_or_identifier.username or login_req_or_identifier.identifier or "").strip()
            if login_req_or_identifier.password:
                pwd = login_req_or_identifier.password.strip()

        if not username:
            return None

        clean_lower = username.lower()
        clean_upper = username.upper()

        matched_fam: Optional[FamilyAccount] = None

        # 1. By pairing code
        fam_id = self._pairing_map.get(clean_upper)
        if fam_id and fam_id in self._families:
            matched_fam = self._families[fam_id]

        # 2. By username, admin phone number, or ID
        if not matched_fam:
            for fam in self._families.values():
                if (
                    (fam.username and fam.username.lower() == clean_lower)
                    or (fam.admin_phone and fam.admin_phone.strip() == username)
                    or (fam.id == username)
                ):
                    matched_fam = fam
                    break

        if not matched_fam:
            return None

        # 3. Check password if provided
        if pwd is not None and pwd != "":
            if matched_fam.password and matched_fam.password != pwd:
                return None

        return matched_fam

    def list_families(self) -> List[FamilyAccount]:
        return list(self._families.values())

    def create_family(self, req: FamilyRegistrationRequest) -> FamilyAccount:
        fam_id = f"fam_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        pairing_code = self._generate_pairing_code()

        elder = ElderProfile(
            id=f"elder_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            family_id=fam_id,
            full_name=req.elder_full_name.strip(),
            preferred_name=req.elder_preferred_name.strip(),
            honorific=req.honorific.strip(),
            birth_year=req.birth_year,
            address=req.address.strip() if req.address else "Việt Nam",
            primary_caregiver_phone=req.admin_phone.strip() if req.admin_phone else "0900000000",
            medical_notes=req.medical_notes.strip() if req.medical_notes else None,
            ai_name=req.ai_name.strip() if req.ai_name else "An Nhiên"
        )

        username = (req.username or "").strip()
        if not username:
            username = req.admin_phone.strip() if req.admin_phone and req.admin_phone != "0900000000" else f"user_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        password = req.password.strip() if req.password else "123456"
        fam_name = req.family_name.strip() if req.family_name else f"Gia Đình {req.elder_preferred_name or req.elder_full_name}"

        fam = FamilyAccount(
            id=fam_id,
            username=username,
            password=password,
            family_name=fam_name,
            admin_phone=req.admin_phone.strip() if req.admin_phone else "0900000000",
            pairing_code=pairing_code,
            created_at=datetime.utcnow().isoformat(),
            elder=elder
        )

        self._families[fam_id] = fam
        self._pairing_map[pairing_code] = fam_id
        logger.info(f"New family account created: user '{username}' ({fam.family_name}) with code {pairing_code}")
        return fam

    def update_elder_profile(self, family_id: str, updates: dict) -> Optional[ElderProfile]:
        fam = self._families.get(family_id)
        if not fam or not fam.elder:
            return None

        for k, v in updates.items():
            if hasattr(fam.elder, k) and v is not None:
                setattr(fam.elder, k, v)
        fam.elder.updated_at = datetime.utcnow().isoformat()
        return fam.elder


family_service = FamilyService()
