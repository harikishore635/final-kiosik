import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Calendar, Edit2, Trash2, Heart, Baby } from 'lucide-react';

/**
 * DependentCard — Reusable card for displaying a dependent (child or elderly parent).
 * Shows: name, relationship, age/DOB, gender, and action buttons (edit/remove).
 */
const DependentCard = ({ dependent, onEdit, onRemove }) => {
  const { t } = useTranslation();

  const relationKeys = {
    child: 'familyProfile.child',
    elderly_parent: 'familyProfile.elderlyParent',
  };
  const genderKeys = {
    Male: 'familyProfile.male',
    Female: 'familyProfile.female',
    Other: 'familyProfile.other',
  };

  const relation = relationKeys[dependent.relationship] ? t(relationKeys[dependent.relationship]) : dependent.relationship;
  const gender = genderKeys[dependent.gender] ? t(genderKeys[dependent.gender]) : dependent.gender;

  const isChild = dependent.relationship === 'child';
  const iconBg = isChild ? 'from-pink-400 to-rose-500' : 'from-amber-400 to-orange-500';
  const IconComp = isChild ? Baby : Heart;

  return (
    <div className="bg-white rounded-2xl shadow-kiosk p-5 border border-gray-100 transition-all hover:shadow-kiosk-hover">
      <div className="flex items-start space-x-4">
        {/* Avatar icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <IconComp className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-800 truncate">{dependent.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isChild ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {relation}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <User className="w-3 h-3" /> {gender}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t('familyProfile.age')}: {dependent.age}
            </span>
          </div>
          {dependent.aadhaar && (
            <p className="text-xs text-gray-400 mt-1">
              {t('familyProfile.aadhaar')}: XXXX-XXXX-{dependent.aadhaar.slice(-4)}
            </p>
          )}
          {dependent.disability && (
            <p className="text-xs text-purple-600 mt-1">
               {t('familyProfile.disability')}: {dependent.disability}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(dependent)}
              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              aria-label={t('familyProfile.editName', { name: dependent.name })}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(dependent.id)}
              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              aria-label={t('familyProfile.removeName', { name: dependent.name })}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DependentCard;
