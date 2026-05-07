import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  Container,
  Title,
  Text,
  Stack,
  Divider,
  Alert,
  Box,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";

export default function TermsAndConditionsPage() {
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const terms = organization?.termsAndConditions;
  const hasContent = terms?.enabled && terms?.text?.trim();

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Box>
          {organization?.name && (
            <Text size="sm" c="dimmed" mb={4}>
              {organization.name}
            </Text>
          )}
          <Title order={2}>Términos y Condiciones</Title>
          <Divider mt="sm" />
        </Box>

        {hasContent ? (
          <Text
            size="sm"
            style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
          >
            {terms!.text}
          </Text>
        ) : (
          <Alert
            icon={<IconFileText size={16} />}
            color="gray"
            variant="light"
          >
            Esta organización aún no ha publicado sus términos y condiciones.
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
